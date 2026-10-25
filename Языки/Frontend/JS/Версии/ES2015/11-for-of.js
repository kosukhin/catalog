// Фича: for...of и протокол итерации
console.log("=== 11. for...of ===");

for (const ch of "абв") process.stdout.write(ch);
console.log(" <- строка итерируема");

for (const [i, v] of ["a", "b", "c"].entries()) {
  process.stdout.write(`${i}:${v} `);
}
console.log(" <- entries() даёт пары индекс/значение");

const map = new Map([[1, "один"], [2, "два"]]);
for (const [k, v] of map) process.stdout.write(`${k}=${v} `);
console.log("");

// Свой итерируемый объект через Symbol.iterator
const range = { from: 1, to: 3, [Symbol.iterator]() {
  let cur = this.from, last = this.to;
  return { next: () => cur <= last ? { value: cur++, done: false } : { done: true } };
}};
for (const n of range) process.stdout.write(n + " ");
console.log(" <- кастомный итератор");
