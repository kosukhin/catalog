/**
 * server.js — точка входа: HTTP (Express) + WebSocket (ws).
 *
 * Схема работы:
 *   1. Клиент открывает WS /ws?room=general и отправляет своё имя.
 *   2. Сервер подписывается на Redis-канал chat:<room> (одна подписка на комнату на процесс).
 *   3. Клиент шлёт { user, text } → сервер вызывает PUBLISH chat:<room> {json}.
 *   4. Redis доставляет сообщение всем процессам, подписанным на канал.
 *   5. Каждый процесс рассылает его своим WS-клиентам в этой комнате.
 * Благодаря шагам 3–4 пользователи, подключённые к app1 (порт 3002) и app2 (порт 3003),
 * видят одни и те же сообщения.
 */
const http = require('http');
const { WebSocketServer } = require('ws');
const app = require('./app');
const { subscribeRoom, unsubscribeRoom, publishMessage, history } = require('./pubsub');

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/** room → Map(ws → nick). Подписка на канал Redis — одна на комнату на процесс. */
const rooms = new Map();
const redisSubs = new Map();

function clientsIn(room) {
  if (!rooms.has(room)) rooms.set(room, new Map());
  return rooms.get(room);
}

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const room = url.searchParams.get('room') || 'general';
  const clients = clientsIn(room);
  clients.set(ws, url.searchParams.get('nick') || 'anonymous');

  // Первому клиенту комнаты в этом процессе — создаём подписку Redis.
  if (clients.size === 1 && !redisSubs.has(room)) {
    redisSubs.set(room, true);
    await subscribeRoom(room, (message) => {
      for (const [client, nick] of clients) {
        if (client.readyState === client.OPEN) client.send(JSON.stringify(message));
      }
    });
    // Новому клиенту отправляем историю комнаты.
    const msgs = await history(room, 50);
    for (const m of msgs) ws.send(JSON.stringify(m));
  }

  ws.on('message', async (raw) => {
    try {
      const { user, text } = JSON.parse(raw);
      if (!text) return;
      // PUBLISH — Redis разнесёт сообщение по всем инстансам приложения.
      await publishMessage(room, user || clients.get(ws), String(text));
    } catch (e) { /* игнорируем некорректный ввод */ }
  });

  ws.on('close', async () => {
    clients.delete(ws);
    // Последний клиент комнаты в этом процессе — отписываемся от канала.
    if (clients.size === 0 && redisSubs.has(room)) {
      redisSubs.delete(room);
      await unsubscribeRoom(room);
    }
  });
});

const port = process.env.PORT || 3002;
if (require.main === module) {
  server.listen(port, () => console.log(`pub/sub chat listening on :${port}`));
}

module.exports = server;
