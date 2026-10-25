// Фича: Promise.try — обернуть синхронную или async-функцию в промис
console.log("=== 03. Promise.try ===");

// Раньше: Promise.resolve().then(() => можетБроситьИсключение())
// Проблема: исключение в синхронном коде вне then не попадает в промис
function riskySync() { throw new Error("синхронный сбой"); }

Promise.try(riskySync)
  .catch(e => console.log("try поймал синхронную ошибку:", e.message));

// Работает и с аргументами, и с async-функциями
Promise.try((a, b) => a + b, 2, 3)
  .then(v => console.log("try с аргументами:", v));

Promise.try(async () => "из async")
  .then(v => console.log("try async:", v));
