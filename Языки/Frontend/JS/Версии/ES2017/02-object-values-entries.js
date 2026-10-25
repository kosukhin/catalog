// Фича: Object.values и Object.entries
console.log("=== 02. Object.values / Object.entries ===");

const scores = { anna: 95, boris: 82, vera: 77 };

// Object.values — только значения (аналог Object.keys для значений)
console.log("values:", Object.values(scores));

// Object.entries — пары [ключ, значение]
console.log("entries:", Object.entries(scores));

// Практика: сортировка объекта по значениям
const sorted = Object.entries(scores)
  .sort((a, b) => b[1] - a[1])
  .map(([name, score]) => `${name}: ${score}`);
console.log("топ:", sorted);

// Практика: обратный словарь
const inverted = Object.fromEntries(Object.entries(scores).map(([k, v]) => [v, k]));
console.log("инвертировано:", JSON.stringify(inverted));
