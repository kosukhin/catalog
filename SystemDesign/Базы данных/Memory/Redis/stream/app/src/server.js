const { startWorker, reclaimStalled, GROUPS } = require('./streams');
const app = require('./app');

// --- Обработчики для каждой группы ---

// inventory: резервирует товар на складе
async function handleInventory(msg) {
  console.log(`[inventory] reserved stock for order ${msg.orderId} (user: ${msg.userId})`);
  // имитация работы: 50ms на резерв
  await new Promise(r => setTimeout(r, 50));
}

// payment: списывает деньги (имитация падения на "crash" заказах)
async function handlePayment(msg) {
  if (msg.userId === 'crash') {
    throw new Error('payment gateway timeout');
  }
  console.log(`[payment] charged ${msg.total} for order ${msg.orderId}`);
  await new Promise(r => setTimeout(r, 30));
}

// email: отправляет уведомление
async function handleEmail(msg) {
  console.log(`[email] sent confirmation to user ${msg.userId} for order ${msg.orderId}`);
  await new Promise(r => setTimeout(r, 20));
}

// --- Запуск воркеров ---
for (const group of GROUPS) {
  const handler = { inventory: handleInventory, payment: handlePayment, email: handleEmail }[group];
  startWorker(group, handler);
}

// --- Восстановление зависших сообщений ---
for (const group of GROUPS) {
  setInterval(async () => {
    const n = await reclaimStalled(group, 500).catch(() => 0);
    if (n) console.log(`[${group}] reclaimed ${n} stalled message(s)`);
  }, 2000);
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`order processing demo listening on :${port}`));
