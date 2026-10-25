// Фича: async/await — синхронный стиль для асинхронного кода
console.log("=== 01. async/await ===");

const wait = (ms, value) => new Promise(r => setTimeout(() => r(value), ms));

async function main() {
  // await ставит выполнение на паузу до завершения промиса
  const v1 = await wait(30, "первый");
  console.log(v1);

  // try/catch работает как в синхронном коде
  try {
    await Promise.reject(new Error("упс"));
  } catch (e) {
    console.log("ошибка поймана:", e.message);
  }

  // Параллельность: await только объединяет, комбинаторы всё ещё нужны
  const t0 = Date.now();
  const [a, b] = await Promise.all([wait(50, "A"), wait(50, "B")]);
  console.log("параллельно за", Date.now() - t0, "мс:", a, b);

  // Последовательно было бы вдвое дольше
  const seq = [await wait(30, "1"), await wait(30, "2")];
  console.log("последовательно:", seq);
}

main();
