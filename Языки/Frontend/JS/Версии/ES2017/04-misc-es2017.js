// Фичи: trailing commas в функциях, Object.getOwnPropertyDescriptors, shared memory (Atomic*
console.log("=== 04. Прочее из ES2017 ===");

// 1. Trailing commas в списках аргументов и параметров
function f(a, b,) { return a + b; }
console.log("trailing commas:", f(1, 2,));

// 2. Object.getOwnPropertyDescriptors — «безопасное» копирование геттеров/сеттеров
const withGetter = {
  value: 10,
  get half() { return this.value / 2; },
};
const badCopy = Object.assign({}, withGetter);
console.log("Object.assign потерял геттер:", badCopy.half); // undefined
const copy = {};
Object.defineProperties(copy, Object.getOwnPropertyDescriptors(withGetter));
console.log("getOwnPropertyDescriptors сохранил:", copy.half); // 5

// 3. SharedArrayBuffer и Atomics (в новых Node — с флагом, поэтому только проверка наличия)
console.log("SharedArrayBuffer объявлен:", typeof SharedArrayBuffer !== "undefined");
