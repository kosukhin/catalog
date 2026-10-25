// Фича: операторы spread (...) и rest (...)
console.log("=== 06. Spread и rest ===");

// rest — собирает аргументы в массив
function sum(...nums) {
  return nums.reduce((s, n) => s + n, 0);
}
console.log("rest:", sum(1, 2, 3), sum(1, 2, 3, 4, 5));

// spread — разворачивает массив/строку в набор аргументов или элементов
console.log("spread в вызов:", Math.max(...[5, 9, 2]));
console.log("spread в массив:", [...[1, 2], ...[3, 4]]);
console.log("строка в массив символов:", [..."абв"]);

// Практика: копия массива
const original = [1, 2, 3];
const copy = [...original];
copy.push(4);
console.log("копия независима:", original, copy);
