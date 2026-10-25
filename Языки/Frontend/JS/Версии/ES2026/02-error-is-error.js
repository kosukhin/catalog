// Фича: Error.isError — надёжная проверка «это ошибка?»
console.log("=== 02. Error.isError ===");

// Проблема instanceof: несколько реалмов (vm/iframe/workers) или кросс-контекст
// ошибки ломают instanceof, а проверка name/message — ненадёжна.
try {
  throw new Error("настоящая ошибка");
} catch (e) {
  console.log("Error:", Error.isError(e)); // true
}

try {
  throw "строка вместо ошибки"; // JS позволяет кидать что угодно!
} catch (e) {
  console.log("строка:", Error.isError(e)); // false
  console.log("instanceof тоже false:", e instanceof Error);
}

// Подделка: объект с прототипом Error — но не реальный Error
const fake = Object.create(Error.prototype);
console.log("подделка instanceof:", fake instanceof Error); // true (!)
console.log("подделка Error.isError:", Error.isError(fake)); // false — честно!

// TypeError, RangeError и другие подтипы — тоже ошибки
try { null.foo; } catch (e) { console.log("TypeError:", Error.isError(e)); }
