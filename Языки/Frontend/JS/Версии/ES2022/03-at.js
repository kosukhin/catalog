// Фича: .at() — индексация с отрицательными значениями
console.log("=== 03. Array/String .at() ===");

const arr = ["a", "b", "c", "d", "e"];
console.log("arr.at(0):", arr.at(0));
console.log("arr.at(-1):", arr.at(-1));   // последний
console.log("arr.at(-2):", arr.at(-2));   // предпоследний
console.log("arr[arr.length - 1]:", arr[arr.length - 1]); // старый способ

// Работает и со строками
console.log("'привет'.at(-1):", "привет".at(-1));
console.log("TypedArray:", new Int32Array([10, 20, 30]).at(-1));

// Вне диапазона — undefined (как и при обычной индексации)
console.log("arr.at(99):", arr.at(99));
