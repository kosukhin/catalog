/**
 * app.js — Express-приложение чата.
 * Маршруты REST + WS-логика вынесена в server.js, здесь — HTTP API и веб-клиент.
 */
const express = require('express');
const { history, stats, redis } = require('./pubsub');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try { await redis.ping(); res.json({ status: 'ok', redis: 'up' }); }
  catch (e) { res.status(503).json({ status: 'degraded', redis: 'down' }); }
});

/** История комнаты (Pub/Sub её не хранит, поэтому читаем из Redis LIST). */
app.get('/rooms/:room/history', async (req, res) => {
  res.json({ room: req.params.room, messages: await history(req.params.room) });
});

/** Активные каналы Pub/Sub и число подписчиков на каждом. */
app.get('/stats', async (req, res) => {
  res.json(await stats());
});

/** HTTP-альтернатива WebSocket: отправить сообщение через REST (PUBLISH). */
app.post('/rooms/:room/messages', async (req, res) => {
  const { user = 'anonymous', text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });
  const { publishMessage } = require('./pubsub');
  const result = await publishMessage(req.params.room, user, String(text));
  res.status(201).json(result);
});

const dashboard = `<!doctype html><html><head><title>Redis Pub/Sub Chat</title><meta charset="utf-8">
<style>body{font-family:monospace;background:#111;color:#0f0;padding:1rem}
#log{height:60vh;overflow-y:auto;background:#000;border:1px solid #0f0;padding:.5rem}
input,button{font-family:monospace;background:#000;color:#0f0;border:1px solid #0f0;padding:.3rem}
.row{margin:.15rem 0}</style></head>
<body><h1>Redis Pub/Sub Chat</h1>
<div>Ник: <input id="nick" value="guest-1"> Комната: <input id="room" value="general">
<button onclick="join()">подключиться</button></div>
<div id="log"></div>
<input id="msg" style="width:70%" placeholder="сообщение...">
<button onclick="send()">отправить</button>
<script>
let ws;
function join(){
  if(ws) ws.close();
  const r=document.getElementById('room').value;
  ws=new WebSocket('ws://'+location.host+'/ws?room='+r);
  ws.onopen=()=>log('** подключены к комнате '+r+' **');
  ws.onmessage=e=>{const m=JSON.parse(e.data);log('['+new Date(m.ts).toLocaleTimeString()+'] '+m.user+': '+m.text)};
  ws.onclose=()=>log('** отключены **');
}
function send(){
  const t=document.getElementById('msg').value; if(!t)return;
  ws.send(JSON.stringify({user:document.getElementById('nick').value,text:t}));
  document.getElementById('msg').value='';
}
document.getElementById('msg').addEventListener('keydown',e=>{if(e.key==='Enter')send()});
function log(s){const d=document.getElementById('log');d.innerHTML+='<div class=row>'+s+'</div>';d.scrollTop=d.scrollHeight;}
</script></body></html>`;
app.get('/', (req, res) => res.send(dashboard));

module.exports = app;
