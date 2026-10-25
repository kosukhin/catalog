// Фича: Array.prototype.includes — проверка наличия элемента
console.log("=== 01. Array.prototype.includes ===");

console.log([1, 2, 3].includes(2));            // true
console.log([1, 2, 3].includes(4));            // false
console.log([1, 2, NaN].includes(NaN));        // true — indexOf(NaN) так не умел!
console.log([1, 2, NaN].indexOf(NaN) === -1);  // indexOf не находит NaN

// Второй аргумент — позиция начала поиска (поддерживает отрицательные индексы)
console.log([1, 2, 3].includes(1, 1));   // false (ищем с индекса 1)
console.log([1, 2, 3].includes(3, -1));  // true

// Поведение с дырками в разрежённых массивах
console.log([, ,].includes(undefined));  // true
