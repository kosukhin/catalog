process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const { redis, publishOrder, ensureGroups, reclaimStalled, stats, orderStatus, STREAM, GROUPS } = require('../src/streams');

beforeAll(async () => {
  await redis.flushdb();
  await ensureGroups();
});

afterAll(async () => {
  redis.disconnect();
});

test('XADD добавляет заказ в стрим', async () => {
  const id = await publishOrder({ orderId: 'ord-1', userId: 'user-1', total: 500, items: ['book'] });
  expect(id).toMatch(/^\d+-\d+$/);
  const len = await redis.xlen(STREAM);
  expect(len).toBe(1);
});

test('consumer group читает заказ, ACK убирает из pending', async () => {
  await publishOrder({ orderId: 'ord-2', userId: 'user-2', total: 200 });

  const res = await redis.xreadgroup('GROUP', 'inventory', 'test-worker', 'COUNT', 10, 'STREAMS', STREAM, '>');
  expect(res).toBeTruthy();
  const entries = res[0][1];
  expect(entries.length).toBeGreaterThanOrEqual(1);

  let st = await stats();
  const pendingBefore = st.groups.inventory.pending;

  await redis.xack(STREAM, 'inventory', entries[entries.length - 1][0]);
  st = await stats();
  expect(st.groups.inventory.pending).toBe(pendingBefore - 1);
});

test('не-ACKнутый заказ висит в PEL и восстанавливается через XAUTOCLAIM', async () => {
  await publishOrder({ orderId: 'ord-3', userId: 'crash', total: 999 });

  // читаем как воркер, который "упадёт" (не ACK)
  const res = await redis.xreadgroup('GROUP', 'payment', 'worker-1', 'COUNT', 10, 'STREAMS', STREAM, '>');
  const entries = res[0][1];
  expect(entries.length).toBeGreaterThanOrEqual(1);

  const pendingBefore = (await stats()).groups.payment.pending;
  expect(pendingBefore).toBeGreaterThanOrEqual(1);

  // восстанавливаем зависшие
  const reclaimed = await reclaimStalled('payment', 0);
  expect(reclaimed).toBeGreaterThanOrEqual(1);

  const pendingAfter = (await stats()).groups.payment.pending;
  expect(pendingAfter).toBe(pendingBefore - reclaimed);
});

test('HTTP API: POST /orders и GET /stats работают', async () => {
  const request = require('supertest');
  const app = require('../src/app');

  const post = await request(app).post('/orders').send({ userId: 'user-4', total: 300, items: ['pen'] });
  expect(post.status).toBe(201);
  expect(post.body.orderId).toMatch(/^ord-/);
  expect(post.body.streamId).toMatch(/^\d+-\d+$/);

  const get = await request(app).get('/stats');
  expect(get.status).toBe(200);
  expect(get.body.stream).toBe(STREAM);
  expect(get.body.totalOrders).toBeGreaterThanOrEqual(1);
  expect(get.body.groups).toHaveProperty('inventory');
  expect(get.body.groups).toHaveProperty('payment');
  expect(get.body.groups).toHaveProperty('email');
});

test('HTTP API: GET /orders/:id возвращает статус заказа', async () => {
  const request = require('supertest');
  const app = require('../src/app');

  const post = await request(app).post('/orders').send({ userId: 'user-5', total: 150 });
  const orderId = post.body.orderId;

  const get = await request(app).get(`/orders/${orderId}`);
  expect(get.status).toBe(200);
  expect(get.body.orderId).toBe(orderId);
  expect(get.body.userId).toBe('user-5');
});

