const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const STREAM = 'events';
const GROUP = 'workers';
const CONSUMER = process.env.HOSTNAME || 'worker-1';

/** Producer: XADD с ограничением длины (~ — приблизительный trim, дёшево) */
async function publish(event) {
  const id = await redis.xadd(
    STREAM,
    'MAXLEN', '~', '1000',
    '*',
    'user', event.user,
    'action', event.action
  );
  return id;
}

/** Создать consumer group (с чтением всей истории), идемпотентно */
async function ensureGroup() {
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '0', 'MKSTREAM');
  } catch (err) {
    if (!String(err.message).includes('BUSYGROUP')) throw err;
  }
}

/**
 * Воркер: читает новые сообщения (">"), обрабатывает, ACK.
 * action === 'crash' — имитация падения обработчика (сообщение не ACK, висит в PEL).
 */
async function startWorker(onMessage) {
  await ensureGroup();
  const loop = async () => {
    while (true) {
      try {
        const res = await redis.xreadgroup(
          'GROUP', GROUP, CONSUMER,
          'COUNT', 10,
          'BLOCK', 5000,
          'STREAMS', STREAM, '>'
        );
        if (!res) continue;
        for (const [, entries] of res) {
          for (const [id, fields] of entries) {
            const msg = {};
            for (let i = 0; i < fields.length; i += 2) msg[fields[i]] = fields[i + 1];
            if (msg.action === 'crash') {
              // обработчик упал — сообщение осталось pending (PEL)
              if (onMessage) onMessage(msg, id, true);
              continue;
            }
            if (onMessage) onMessage(msg, id, false);
            await redis.xack(STREAM, GROUP, id);
          }
        }
      } catch (err) {
        console.error('worker error:', err.message);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };
  loop();
}

/**
 * Восстановление зависших сообщений: XAUTOCLAIM забирает pending-сообщения
 * с idle > threshold (их не обработал упавший воркер) и ACK-ает их здесь.
 * Возвращает количество восстановленных сообщений.
 */
async function reclaimStalled(minIdleMs = 500) {
  const res = await redis.xautoclaim(STREAM, GROUP, 'reclaimer', minIdleMs, '0', 'COUNT', 10);
  const [nextCursor, entries] = res;
  let count = 0;
  for (const [id, fields] of entries || []) {
    const msg = {};
    for (let i = 0; i < fields.length; i += 2) msg[fields[i]] = fields[i + 1];
    console.log(`reclaimed stuck message ${id}:`, msg);
    await redis.xack(STREAM, GROUP, id);
    count++;
  }
  return count;
}

/** Статистика стрима и группы */
async function stats() {
  const len = await redis.xlen(STREAM);
  let info = {}, pending = 0, consumers = [];
  try {
    info = await redis.xinfo('STREAM', STREAM);
    // ioredis возвращает плоский массив [name, value, ...]
    for (let i = 0; i < info.length; i += 2) info[info[i]] = info[i + 1];
  } catch (_) {}
  try {
    const pend = await redis.xpending(STREAM, GROUP);
    pending = pend[0]; // количество pending-сообщений
    consumers = (await redis.xpending(STREAM, GROUP, 'CONSUMERS')) || [];
  } catch (_) {}
  return {
    stream: STREAM,
    length: len,
    lastId: info['last-generated-id'] || null,
    firstId: info['first-entry'] ? info['first-entry'][0] : null,
    lastEntryId: info['last-entry'] ? info['last-entry'][0] : null,
    pendingCount: pending,
    consumers: consumers.map(c => ({ name: c[1], pending: c[3], idleMs: c[5] }))
  };
}

module.exports = { redis, publish, ensureGroup, startWorker, reclaimStalled, stats, STREAM, GROUP };
