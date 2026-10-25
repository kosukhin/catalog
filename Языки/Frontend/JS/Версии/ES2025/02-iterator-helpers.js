// Фича: helper-методы итераторов — map/filter/take/drop прямо на итераторах
console.log("=== 02. Iterator helpers ===");

function* natural() { let i = 1; while (true) yield i++; } // бесконечный итератор

// Ленивые цепочки: ничего не вычисляется до материализации
const result = natural()
  .map(n => n * n)            // квадраты
  .filter(n => n % 2 === 0)   // чётные квадраты
  .take(5);                   // первые 5

console.log("ленивые итераторы:", [...result]);
console.log("тип:", result[Symbol.iterator] ? "итератор" : "массив");

// drop — пропустить первые N; take и drop на обычных итераторах
console.log("drop(3):", [...natural().drop(3).take(3)]);
console.log("flatMap:", [...["ab", "cd"].values().flatMap(s => s.split("")).take(4)]);

// Раньше для ленивых цепочек нужна была библиотека (lodash/ramda) или генераторы вручную
