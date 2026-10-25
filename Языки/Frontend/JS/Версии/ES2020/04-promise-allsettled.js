// Фича: Promise.allSettled — ждём ВСЕ промисы, включая упавшие
console.log("=== 04. Promise.allSettled ===");

const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));

async function main() {
  const tasks = [wait(40, "успех-1"), Promise.reject(new Error("сбой")), wait(20, "успех-2")];

  // all упал бы на первой же ошибке, allSettled дожидается всех
  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    console.log(`задача ${i}:`, r.status, r.status === "fulfilled" ? r.value : r.reason.message);
  });

  // Практика: разделение на успехи и ошибки
  const ok = results.filter(r => r.status === "fulfilled").map(r => r.value);
  const failed = results.filter(r => r.status === "rejected").map(r => r.reason.message);
  console.log("успехи:", ok, "| ошибки:", failed);
}

main();
