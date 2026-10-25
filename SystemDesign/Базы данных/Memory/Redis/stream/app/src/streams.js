const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const STREAM = 'orders';
const GROUPS = ['inventory', 'payment', 'email'];

/** Producer: XADD с ограничением длины */
async function publishOrder(order) {
  const id = await redis.xadd(
    STREAM,
    'MAXLEN', '~', '1000',
    '*',
    'orderId', order.orderId,
    'userId', order.userId,
    'total', String(order.total),
    'items', JSON.stringify(order.items || [])
  );
  return id;
}

/** Создать все consumer groups (идемпотентно) */
async function ensureGroups() {
  for (const g of GROUPS) {
    try {
      await redis.xgroup('CREATE', STREAM, g, '0', 'MKSTREAM');
    } catch (err) {
      if (!String(err.message).includes('BUSYGROUP')) throw err;
    }
  }
}

/**
 * Воркер группы: читает новые сообщения, обрабатывает, ACK.
 * Каждая группа — свой обработчик.
 */
async function startWorker(group, handler) {
  await ensureGroups();
  const consumer = `${group}-${process.env.HOSTNAME || '1'}`;
  const loop = async () => {
    while (true) {
      try {
        const res = await redis.xreadgroup(
          'GROUP', group, consumer,
          'COUNT', 10,
          'BLOCK', 5000,
          'STREAMS', STREAM, '>'
        );
        if (!res) continue;
        for (const [, entries] of res) {
          for (const [id, fields] of entries) {
            const msg = {};
            for (let i = 0; i < fields.length; i += 2) msg[fields[i]] = fields[i + 1];

            let crashed = false;
            try {
              await handler(msg, id);
            } catch (err) {
              crashed = true;
              console.error(`[${group}] handler crashed on ${id}:`, err.message);
            }
            if (!crashed) {
              await redis.xack(STREAM, group, id);
              await redis.hset(`order:${msg.orderId}`, `status:${group}`, 'done');
            } else {
              // сообщение остаётся в PEL — recovery подхватит
              await redis.hset(`order:${msg.orderId}`, `status:${group}`, 'pending');
            }
          }
        }
      } catch (err) {
        console.error(`[${group}] worker error:`, err.message);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };
  loop();
}

/**
 * Восстановление зависших сообщений из PEL (at-least-once).
 * Забирает сообщения с idle > threshold и ACK-ает.
 */
async function reclaimStalled(group, minIdleMs = 500) {
  const res = await redis.xautoclaim(STREAM, group, `${group}-reclaimer`, minIdleMs, '0', 'COUNT', 10);
  const [, entries] = res;
  let count = 0;
  for (const [id, fields] of entries || []) {
    const msg = {};
    for (let i = 0; i < fields.length; i += 2) msg[fields[i]] = fields[i + 1];
    console.log(`[${group}] reclaimed stalled ${id}: order ${msg.orderId}`);
    await redis.xack(STREAM, group, id);
    await redis.hset(`order:${msg.orderId}`, `status:${group}`, 'recovered');
    count++;
  }
  return count;
}

/** Статистика: длина стрима, pending по группам, количество заказов */
async function stats() {
  const len = await redis.xlen(STREAM);
  const groupStats = {};
  for (const g of GROUPS) {
    let pending = 0;
    try {
      const pend = await redis.xpending(STREAM, g);
      pending = pend[0];
    } catch (_) {}
    groupStats[g] = { pending };
  }
  return { stream: STREAM, totalOrders: len, groups: groupStats };
}

/** Статус конкретного заказа */
async function orderStatus(orderId) {
  const data = await redis.hgetall(`order:${orderId}`);
  return data;
}

module.exports = { redis, publishOrder, ensureGroups, startWorker, reclaimStalled, stats, orderStatus, STREAM, GROUPS };

