// Фича: Symbol — новый примитив, уникальные ключи, скрытые свойства
console.log("=== 09. Symbol ===");

const ID = Symbol("id");
const ID2 = Symbol("id");
console.log("каждый Symbol уникален:", ID === ID2); // false
console.log("typeof:", typeof ID);

const obj = { [ID]: 42, name: "товар" };
console.log("доступ по Symbol:", obj[ID]);
console.log("не виден в for..in / Object.keys:", Object.keys(obj).join(","));
console.log("но доступен через getOwnPropertySymbols:",
  Object.getOwnPropertySymbols(obj).map(s => obj[s]).join(","));

// Глобальный реестр: Symbol.for возвращает один и тот же символ
console.log("Symbol.for реестр:", Symbol.for("x") === Symbol.for("x"));
