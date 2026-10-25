const express = require('express');
const { publishOrder, stats, orderStatus, redis, STREAM } = require('./streams');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try { await redis.ping(); res.json({ status: 'ok', redis: 'up' }); }
  catch (e) { res.status(503).json({ status: 'degraded', redis: 'down' }); }
});

/** Producer: создать заказ */
app.post('/orders', async (req, res) => {
  const { userId = 'user-1', total = 100, items = [] } = req.body || {};
  const orderId = `ord-${Date.now()}`;
  const id = await publishOrder({ orderId, userId, total, items });
  await redis.hset(`order:${orderId}`, 'orderId', orderId, 'userId', userId, 'total', String(total), 'streamId', id);
  res.status(201).json({ orderId, streamId: id, stream: STREAM });
});

/** Статус заказа: какие группы обработали */
app.get('/orders/:id', async (req, res) => {
  const data = await orderStatus(req.params.id);
  if (!data || !data.orderId) return res.status(404).json({ error: 'not found' });
  res.json(data);
});

/** Статистика стрима и pending по группам */
app.get('/stats', async (req, res) => {
  res.json(await stats());
});

const dashboard = `<!doctype html><html><head><title>Order Processing</title><meta charset="utf-8">
<style>body{font-family:monospace;background:#111;color:#0f0;padding:2rem}pre{background:#000;padding:1rem;border:1px solid #0f0}</style></head>
<body><h1>Order Processing (Redis Streams)</h1><div id="s">loading...</div>
<script>setInterval(async()=>{const r=await fetch('/stats');const d=await r.json();
document.getElementById('s').innerHTML='<pre>'+JSON.stringify(d,null,2)+'</pre>';},1000);</script></body></html>`;
app.get('/', (req, res) => res.send(dashboard));

const port = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(port, () => console.log(`order processing demo listening on :${port}`));
}

module.exports = app;

