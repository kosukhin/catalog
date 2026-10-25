// Фича: стрелочные функции + лексический this
console.log("=== 02. Стрелочные функции и this ===");

function Counter() {
  this.count = 0;
  // раньше приходилось писать var self = this;
  this.tick = () => { this.count++; return this.count; };
}
const c = new Counter();
c.tick(); c.tick();
console.log("this берётся из окружения:", c.count); // 2

const add = (a, b) => a + b;               // неявный return
const square = n => n * n;                 // без скобок при одном аргументе
console.log("краткий синтаксис:", add(2, 3), square(4));

// Важное отличие: у стрелочных функций НЕТ своего this/arguments/prototype
console.log("нет prototype:", add.prototype === undefined);
