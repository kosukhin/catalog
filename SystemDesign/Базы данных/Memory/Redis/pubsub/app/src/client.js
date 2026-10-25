/**
 * client.js — CLI-чат-клиент.
 *
 *   node src/client.js [ник] [комната] [порт]
 *   node src/client.js alice general 3002
 *
 * Печатает историю комнаты и входящие сообщения, читает ввод со stdin
 * и отправляет сообщения через WebSocket.
 */
const WebSocket = require('ws');
const readline = require('readline');

const nick = process.argv[2] || 'cli-user';
const room = process.argv[3] || 'general';
const port = process.argv[4] || '3002';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '' });
const ws = new WebSocket(`ws://localhost:${port}/ws?room=${encodeURIComponent(room)}&nick=${encodeURIComponent(nick)}`);

ws.on('open', () => console.log(`-- подключены к #${room} как ${nick} (localhost:${port}) --`));
ws.on('message', (raw) => {
  const m = JSON.parse(raw);
  const time = new Date(m.ts).toLocaleTimeString();
  process.stdout.write(`\r[${time}] ${m.user}: ${m.text}\n> `);
});
ws.on('close', () => { console.log('-- соединение закрыто --'); process.exit(0); });

rl.on('line', (line) => {
  if (line.trim()) ws.send(JSON.stringify({ user: nick, text: line.trim() }));
});
rl.prompt();
