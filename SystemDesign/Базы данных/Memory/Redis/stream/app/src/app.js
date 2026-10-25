const express = require('express');
const { publish, stats, redis, STREAM } = require('./streams');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try { await redis.ping(); res.json({ status: 'ok', redis: 'up' }); }
  catch (e) { res.status(503).json({ status: 'degraded', redis: 'down' }); }
});

/** Producer */
app.post('/events', async (req, res) => {
  const { user = 'anonymous', action = 'ping' } = req.body || {};
  const id = await publish({ user, action });
  res.status(201).json({ id, stream: STREAM });
});

/** Статистика стрима и consumer group */
app.get('/stats', async (req, res) => {
  res.json(await stats());
});

const dashboard = `<!doctype html><html><head><title>Redis Streams</title><meta charset="utf-8">
<style>body{font-family:monospace;background:#111;color:#0f0;padding:2rem}table{border-collapse:collapse}td,th{border:1px solid #0f0;padding:.4rem 1rem}</style></head>
<body><h1>Redis Streams demo</h1><div id="s">loading...</div>
<script>setInterval(async()=>{const r=await fetch('/stats');const d=await r.json();
document.getElementById('s').innerHTML='<pre>'+JSON.stringify(d,null,2)+'</pre>';},1000);</script></body></html>`;
app.get('/', (req, res) => res.send(dashboard));

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`streams demo listening on :${port}`));
}

module.exports = app;
