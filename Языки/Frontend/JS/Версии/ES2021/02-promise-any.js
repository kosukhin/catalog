// Фича: Promise.any — первый УСПЕШНЫЙ промис (в отличие от race)
console.log("=== 02. Promise.any ===");

const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));

async function main() {
  // any игнорирует отклонённые промисы и ждёт первый fulfilled
  const first = await Promise.any([
    wait(50, "медленный"),
    Promise.reject(new Error("сбой-1")),
    wait(20, "быстрый"),
  ]);
  console.log("первый успешный:", first);

  // Если ВСЕ отклонены — AggregateError со списком ошибок
  try {
    await Promise.any([Promise.reject(new Error("о1")), Promise.reject(new Error("о2"))]);
  } catch (e) {
    console.log("AggregateError:", e.name, "| все ошибки:", e.errors.map(x => x.message));
  }
}

main();
