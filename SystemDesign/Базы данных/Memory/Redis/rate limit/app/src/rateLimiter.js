/**
 * Redis-based rate limiter.
 *
 * Реализованы два алгоритма:
 *  1. Fixed Window Counter  — дешёвый, но с граничным эффектом.
 *  2. Sliding Window Counter (гибрид prev/cur) — точный, память O(1).
 *
 * Вся логика выполняется атомарно в Lua-скриптах на стороне Redis,
 * чтобы исключить гонки между инстансами приложения.
 */
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ---------- Скрипты (загружаются один раз, вызываются через EVALSHA) ----------

/**
 * FIXED WINDOW:
 *   KEYS[1] = ключ счётчика (например rate:demo:1.2.3.4:1700000010)
 *   ARGV[1] = ttl окна в секундах, ARGV[2] = лимит
 * Возвращает { allowed(0/1), counter, ttl }
 */
const FIXED_WINDOW_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
if current > tonumber(ARGV[2]) then
  return {0, current, ttl}
end
return {1, current, ttl}
`;

/**
 * SLIDING WINDOW COUNTER (гибрид двух окон):
 *   Окно [now - windowSize, now]. Храним счётчики prev и cur окон.
 *   estimate = prev * (доля текущего окна, которая уже прошла) + cur
 *   KEYS[1] = базовый ключ (rate:demo:id), ARGV[1]=windowSec, ARGV[2]=limit, ARGV[3]=nowMs
 * Возвращает { allowed(0/1), estimate(целое), remainingInCurrentWindow }
 */
const SLIDING_WINDOW_LUA = `
local base = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = math.floor(tonumber(ARGV[3]) / 1000)
local cur_id = math.floor(now / window)
local prev_id = cur_id - 1
local cur_key = base .. ':' .. cur_id
local prev_key = base .. ':' .. prev_id

local cur = tonumber(redis.call('GET', cur_key) or 0)
local prev = tonumber(redis.call('GET', prev_key) or 0)

-- доля текущего окна, которая уже прошла (0..1)
local fraction = (now % window) / window
local estimate = prev * fraction + cur

if estimate >= limit then
  return {0, math.floor(estimate), limit - cur}
end

redis.call('INCR', cur_key)
redis.call('EXPIRE', cur_key, window * 2)
redis.call('EXPIRE', prev_key, window * 2)
return {1, math.floor(estimate) + 1, limit - cur - 1}
`;

// Регистрируем Lua-скрипты (один раз; вызываются через EVALSHA автоматически)
redis.defineCommand('rateFixedWindow', { numberOfKeys: 1, lua: FIXED_WINDOW_LUA });
redis.defineCommand('rateSlidingWindow', { numberOfKeys: 1, lua: SLIDING_WINDOW_LUA });

/**
 * Проверить и учесть запрос. Fixed window.
 * @param {string} key уникальный ключ клиента (ip/user/api)
 * @param {number} limit максимум запросов за окно
 * @param {number} windowSec размер окна в секундах
 */
async function checkFixedWindow(key, limit, windowSec) {
  const [allowed, counter, ttl] = await redis.rateFixedWindow(key, String(windowSec), String(limit));
  return { allowed: allowed === 1, counter, ttl };
}

/**
 * Проверить и учесть запрос. Sliding window counter.
 * @param {string} baseKey базовый ключ клиента (без номера окна)
 */
async function checkSlidingWindow(baseKey, limit, windowSec) {
  const [allowed, used, remaining] = await redis.rateSlidingWindow(baseKey, String(windowSec), String(limit), String(Date.now()));
  return { allowed: allowed === 1, used, remaining: Math.max(remaining, 0) };
}

/** Обёртка: fail-open если Redis недоступен. */
async function applyLimit(strategy, key, limit, windowSec) {
  try {
    return strategy === 'sliding'
      ? await checkSlidingWindow(key, limit, windowSec)
      : await checkFixedWindow(key, limit, windowSec);
  } catch (err) {
    // Redis лежит — решение зависит от сервиса: тут fail-open
    return { allowed: true, counter: 0, error: err.message };
  }
}

/** Express middleware */
function rateLimiterMiddleware({ strategy = 'fixed', limit = 5, windowSec = 10, scope = 'demo' } = {}) {
  return async (req, res, next) => {
    const clientKey = req.ip || 'unknown';
    const key = `rate:${scope}:${clientKey}`;
    const result = await applyLimit(strategy, key, limit, windowSec);

    if (!result.allowed) {
      res.set('X-RateLimit-Limit', String(limit));
      res.set('X-RateLimit-Remaining', '0');
      res.set('Retry-After', String(result.ttl || windowSec));
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded (${limit} req / ${windowSec}s per ${clientKey})`,
        retryAfter: result.ttl || windowSec,
      });
    }
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(result.remaining ?? (limit - result.counter)));
    return next();
  };
}

// Для тестов: закрыть соединение
function close() {
  redis.disconnect();
}

module.exports = { limit: applyLimit, rateLimiterMiddleware, close, redis, FIXED_WINDOW_LUA, SLIDING_WINDOW_LUA };
