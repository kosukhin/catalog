// Фича: Promise.withResolvers — resolve/reject наружу
console.log("=== 02. Promise.withResolvers ===");

// Раньше приходилось делать так:
let manualResolve;
const manualPromise = new Promise(r => { manualResolve = r; });
manualPromise.then(v => console.log("старый способ:", v));
manualResolve("снаружи");

// Теперь — одним вызовом
const { promise, resolve, reject } = Promise.withResolvers();
promise.then(v => console.log("withResolvers:", v));
resolve("готово");

// Практика: пул задач с сигналом завершения
async function withTimeout(promise, ms) {
  const { promise: timer, reject: fail } = Promise.withResolvers();
  setTimeout(() => fail(new Error("таймаут")), ms);
  return Promise.race([promise, timer]);
}

withTimeout(new Promise(r => setTimeout(() => r("быстрая"), 10)), 100)
  .then(v => console.log("успела:", v));
withTimeout(new Promise(r => setTimeout(() => r("медленная"), 200)), 50)
  .catch(e => console.log("не успела:", e.message));
