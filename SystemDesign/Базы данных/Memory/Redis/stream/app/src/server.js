/** Воркеры + веб-сервер в одном процессе (для демо). */
const { startWorker, reclaimStalled } = require('./streams');
const app = require('./app');

// воркер-потребитель
startWorker((msg, id, crashed) => {
  if (crashed) console.error(`!! handler crashed on ${id}: ${msg.user} ${msg.action}`);
  else console.log(`processed ${id}: ${msg.user} ${msg.action}`);
});

// периодически поднимаем зависшие сообщения из PEL
setInterval(async () => {
  const n = await reclaimStalled(500).catch(() => 0);
  if (n) console.log(`reclaimed ${n} stalled message(s)`);
}, 2000);
