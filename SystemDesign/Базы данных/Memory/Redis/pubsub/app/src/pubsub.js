/**
 * pubsub.js — ядро чата: всё взаимодействие с Redis Pub/Sub.
 *
 * Каналы: `chat:<room>`, например `chat:general`.
 * Формат сообщения в канале: JSON { user, text, room, ts }.
 *
 * Важно: ioredis в режиме подписки не может выполнять обычные команды,
 * поэтому используется ДВА соединения:
 *   - redis     — обычный клиент (PUBLISH, хранение истории и т.д.)
 *   - subscriber— отдельный клиент, переведённый в режим подписки
 */
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';
const HISTORY_KEY = (room) => `chat:${room}:history`;
const HISTORY_LIMIT = 100;      // храним последние 100 сообщений комнаты
const HISTORY_TTL = 3600;       // секунда — история живёт час

const redis = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);

/** Подписаться на канал комнаты. onMessage вызывается для каждого сообщения. */
async function subscribeRoom(room, onMessage) {
  const channel = `chat:${room}`;
  await subscriber.subscribe(channel);
  subscriber.on('message', (ch, raw) => {
    if (ch === channel) onMessage(JSON.parse(raw));
  });
}

/** Отписаться от канала комнаты. */
async function unsubscribeRoom(room) {
  await subscriber.unsubscribe(`chat:${room}`);
}

/** Опубликовать сообщение в канал комнаты и сохранить его в историю. */
async function publishMessage(room, user, text) {
  const message = { user, text, room, ts: Date.now() };
  const receivers = await redis.publish(`chat:${room}`, JSON.stringify(message));
  // История — отдельный механизм (LIST + LTRIM), сам Pub/Sub её не хранит.
  const key = HISTORY_KEY(room);
  await redis.lpush(key, JSON.stringify(message));
  await redis.ltrim(key, 0, HISTORY_LIMIT - 1);
  await redis.expire(key, HISTORY_TTL);
  return { message, receivers };
}

/** Последние N сообщений комнаты (старые → новые). */
async function history(room, limit = 50) {
  const raw = await redis.lrange(HISTORY_KEY(room), 0, limit - 1);
  return raw.map(JSON.parse).reverse();
}

/** Служебная информация: активные каналы Pub/Sub и число подписчиков. */
async function stats() {
  const channels = await redis.pubsub('channels', 'chat:*');
  const numPat = await redis.pubsub('numpat');
  const numsub = channels.length ? await redis.pubsub('numsub', ...channels) : [];
  // numsub — плоский массив [channel, count, channel, count, ...]
  const subscribersPerChannel = {};
  for (let i = 0; i < numsub.length; i += 2) subscribersPerChannel[numsub[i]] = numsub[i + 1];
  return {
    activeChannels: channels,
    totalPubSubPatterns: numPat,
    subscribersPerChannel,
  };
}

async function close() {
  await Promise.all([redis.quit(), subscriber.quit()]);
}

module.exports = { redis, subscriber, subscribeRoom, unsubscribeRoom, publishMessage, history, stats, close, HISTORY_LIMIT, HISTORY_TTL };
