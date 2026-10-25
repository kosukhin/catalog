/**
 * Интеграционные тесты rate limiter против реального Redis.
 * Запуск: внутри docker compose (см. README) — `docker compose run --rm app npm test`,
 * или локально с поднятым Redis: `npm test`.
 */
const request = require('supertest');
const { limit, redis, close } = require('../src/rateLimiter');

const prefix = `test:${Date.now()}`; // уникальный префикс ключей на прогон

// DEL не принимает маски — чистим через SCAN + DEL
async function flushPrefix(pattern) {
  const keys = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  if (keys.length) await redis.del(...keys);
}

beforeAll(async () => {
  await redis.ping(); // упадёт, если Redis не поднят
});

afterAll(async () => {
  close();
});

describe('Fixed Window rate limiter', () => {
  test('пропускает запросы до лимита', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await limit('fixed', `${prefix}:fw:user1`, 5, 10);
      expect(r.allowed).toBe(true);
    }
  });

  test('блокирует при превышении порога (429-логика)', async () => {
    const key = `${prefix}:fw:user2`;
    // делаем 5 разрешённых запросов (лимит 5)
    for (let i = 0; i < 5; i++) {
      const r = await limit('fixed', key, 5, 10);
      expect(r.allowed).toBe(true);
    }
    // 6-й и последующие — должны быть заблокированы
    for (let i = 0; i < 3; i++) {
      const r = await limit('fixed', key, 5, 10);
      expect(r.allowed).toBe(false);
      expect(r.counter).toBe(5 + i + 1); // счётчик продолжает расти
    }
  });

  test('счётчик сбрасывается после истечения окна', async () => {
    const key = `${prefix}:fw:expire`;
    // исчерпываем лимит
    for (let i = 0; i < 3; i++) await limit('fixed', key, 3, 1);
    expect((await limit('fixed', key, 3, 1)).allowed).toBe(false);

    // ждём окончания окна (1 сек) + запас
    await new Promise((res) => setTimeout(res, 1300));
    const r = await limit('fixed', key, 3, 1);
    expect(r.allowed).toBe(true);
    expect(r.counter).toBe(1); // окно началось заново
  });

  test('клиенты изолированы друг от друга', async () => {
    const keyA = `${prefix}:iso:a`;
    const keyB = `${prefix}:iso:b`;
    for (let i = 0; i < 3; i++) await limit('fixed', keyA, 3, 10);
    expect((await limit('fixed', keyA, 3, 10)).allowed).toBe(false);
    // клиент B не затронут лимитом клиента A
    expect((await limit('fixed', keyB, 3, 10)).allowed).toBe(true);
  });
});

describe('Sliding Window Counter rate limiter', () => {
  test('пропускает до лимита и блокирует после превышения', async () => {
    const base = `${prefix}:sw:user1`;
    for (let i = 0; i < 4; i++) {
      const r = await limit('sliding', base, 4, 30);
      expect(r.allowed).toBe(true);
    }
    const blocked = await limit('sliding', base, 4, 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.used).toBeGreaterThanOrEqual(4);
  });

  test('считает использованные запросы в remaining', async () => {
    const base = `${prefix}:sw:remaining`;
    const r1 = await limit('sliding', base, 10, 30);
    expect(r1.remaining).toBe(9);
    const r2 = await limit('sliding', base, 10, 30);
    expect(r2.remaining).toBe(8);
  });
});

describe('Express middleware (end-to-end)', () => {
  const testApp = require('../src/app');

  test('GET /api/demo возвращает 429 после 5 запросов с одного IP', async () => {
    const ip = `10.0.0.${Date.now() % 254 + 1}`; // фиктивный IP через X-Forwarded-For не сработает напрямую,
    // поэтому чистим и используем реальный ключ express ip (в тестовом env это ::ffff:127.0.0.1)
    await flushPrefix('rate:demo:*');

    const codes = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(testApp).get('/api/demo');
      codes.push(res.status);
    }
    // первые 5 — 200, остальные — 429
    expect(codes.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(codes.slice(5)).toEqual([429, 429]);
    expect(codes).toContain(429);
  });

  test('429-ответ содержит заголовки Retry-After и X-RateLimit-*', async () => {
    await flushPrefix('rate:demo:*');
    for (let i = 0; i < 5; i++) await request(testApp).get('/api/demo');
    const res = await request(testApp).get('/api/demo');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.headers['x-ratelimit-limit']).toBe('5');
    expect(res.headers['x-ratelimit-remaining']).toBe('0');
    expect(res.body.error).toBe('Too Many Requests');
  });
});
