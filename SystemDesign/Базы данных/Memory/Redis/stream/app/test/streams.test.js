/** Интеграционные тесты Redis Streams против реального Redis. */
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const { redis, publish, ensureGroup, reclaimStalled, stats, STREAM, GROUP } = require('../src/streams');

beforeAll(async () => {
  await redis.del(STREAM);
});

afterAll(async () => {
  redis.disconnect();
});

test('XADD добавляет сообщения, XLEN возвращает их количество', async () => {
  await publish({ user: 'alice', action: 'login' });
  await publish({ user: 'bob', action: 'logout' });
  const len = await redis.xlen(STREAM);
  expect(len).toBe(2);
});

test('consumer group читает новые сообщения, ACK убирает из pending', async () => {
  await ensureGroup();
  await publish({ user: 'carol', action: 'ping' });

  const res = await redis.xreadgroup('GROUP', GROUP, 'test-worker', 'COUNT', 10, 'STREAMS', STREAM, '>');
  expect(res).toBeTruthy();
  const entries = res[0][1];
  expect(entries.length).toBeGreaterThanOrEqual(1);

  let st = await stats();
  const pendingBeforeAck = st.pendingCount;

  // ACK одного сообщения
  await redis.xack(STREAM, GROUP, entries[entries.length - 1][0]);
  st = await stats();
  expect(st.pendingCount).toBe(pendingBeforeAck - 1);
});

test('не-ACKнутые сообщения висят в PEL и восстанавливаются через XAUTOCLAIM', async () => {
  await ensureGroup();
  const id = await publish({ user: 'crasher', action: 'crash' });

  // читаем как воркер, который "упадёт" (не ACK)
  await redis.xreadgroup('GROUP', GROUP, 'worker-1', 'COUNT', 10, 'STREAMS', STREAM, '>');

  let st = await stats();
  const pendingBefore = st.pendingCount;
  expect(pendingBefore).toBeGreaterThanOrEqual(1);

  // восстанавливаем зависшие сообщения
  const reclaimed = await reclaimStalled(0);
  expect(reclaimed).toBeGreaterThanOrEqual(1);

  st = await stats();
  expect(st.pendingCount).toBe(pendingBefore - reclaimed);
  expect(st.pendingCount).toBe(0); // всё восстановлено и ACKнуто
});

test('HTTP API: POST /events и GET /stats работают', async () => {
  const request = require('supertest');
  const app = require('../src/app');

  const post = await request(app).post('/events').send({ user: 'dave', action: 'upload' });
  expect(post.status).toBe(201);
  expect(post.body.id).toMatch(/^\d+-\d+$/); // ID вида timestamp-seq

  const get = await request(app).get('/stats');
  expect(get.status).toBe(200);
  expect(get.body.stream).toBe(STREAM);
  expect(get.body.length).toBeGreaterThanOrEqual(1);
});
