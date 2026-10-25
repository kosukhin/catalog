const express = require('express');
const { rateLimiterMiddleware, redis } = require('./rateLimiter');

const app = express();

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', redis: 'up' });
  } catch (e) {
    res.status(503).json({ status: 'degraded', redis: 'down' });
  }
});

/**
 * Демо-эндпоинт: 5 запросов / 10 секунд на IP (fixed window).
 * Отправь 6+ запросов подряд — получишь 429.
 */
app.get('/api/demo', rateLimiterMiddleware({ strategy: 'fixed', limit: 5, windowSec: 10, scope: 'demo' }), (req, res) => {
  res.json({ ok: true, message: 'request accepted', at: new Date().toISOString() });
});

/**
 * Демо-эндпоинт: sliding window counter, 10 запросов / 60 секунд на IP.
 */
app.get('/api/search', rateLimiterMiddleware({ strategy: 'sliding', limit: 10, windowSec: 60, scope: 'search' }), (req, res) => {
  res.json({ ok: true, results: [] });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`rate-limiter demo listening on :${port}`));
}

module.exports = app;
