/**
 * Тесты Redis Pub/Sub на примере чата.
 * Требуется запущенный Redis из docker-compose (localhost:6381):
 *   cd app && docker compose up -d redis
 */
const { publishMessage, history, stats, subscribeRoom, redis } = require('../src/pubsub');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6381';

beforeAll(async () => {
  const Redis = require('ioredis');
  const probe = new Redis(REDIS_URL);
  try { await probe.ping(); } catch (e) {
    throw new Error('Redis недоступен на ' + REDIS_URL + ' — запустите docker compose up -d redis');
  }
  await probe.quit();
});

afterEach(async () => {
  await redis.flushdb();
});

describe('publishMessage', () => {
  test('доставляет сообщение всем подписчикам канала', async () => {
    const received = [];
    await subscribeRoom('test-room', (m) => received.push(m));
    await new Promise(r => setTimeout(r, 50)); // даём подписке распространиться

    await publishMessage('test-room', 'alice', 'hello');

    await new Promise(r => setTimeout(r, 100));
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ user: 'alice', text: 'hello', room: 'test-room' });
    expect(received[0].ts).toBeGreaterThan(0);
  });

  test('возвращает количество получателей (receivers)', async () => {
    await subscribeRoom('test-room', () => {});
    await new Promise(r => setTimeout(r, 50));
    const { receivers } = await publishMessage('test-room', 'bob', 'hi');
    expect(receivers).toBeGreaterThanOrEqual(1);
  });

  test('без подписчиков receivers = 0 — сообщение никому не доставляется', async () => {
    const { receivers } = await publishMessage('empty-room', 'carol', 'echo?');
    expect(receivers).toBe(0);
  });
});

describe('history', () => {
  test('сохраняет сообщения и возвращает их в порядке старые → новые', async () => {
    await subscribeRoom('hist-room', () => {});
    await new Promise(r => setTimeout(r, 50));
    await publishMessage('hist-room', 'u1', 'first');
    await publishMessage('hist-room', 'u2', 'second');

    const msgs = await history('hist-room');
    expect(msgs.map(m => m.text)).toEqual(['first', 'second']);
  });

  test('пустая комната — пустая история', async () => {
    expect(await history('no-such-room')).toEqual([]);
  });
});

describe('stats', () => {
  test('показывает активные каналы и число подписчиков', async () => {
    await subscribeRoom('stats-room', () => {});
    await new Promise(r => setTimeout(r, 50));
    const s = await stats();
    expect(s.activeChannels).toContain('chat:stats-room');
    expect(s.subscribersPerChannel['chat:stats-room']).toBeGreaterThanOrEqual(1);
  });
});
