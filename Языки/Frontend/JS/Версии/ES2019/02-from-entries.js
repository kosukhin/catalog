// Фича: Object.fromEntries — обратная операция к Object.entries
console.log("=== 02. Object.fromEntries ===");

const pairs = [["name", "Анна"], ["age", 30]];
console.log("из пар:", Object.fromEntries(pairs));

// Практика: трансформация словаря (entries → map → fromEntries)
const prices = { apple: 10, bread: 25, milk: 30 };
const withVat = Object.fromEntries(
  Object.entries(prices).map(([item, price]) => [item, +(price * 1.2).toFixed(2)])
);
console.log("цены с НДС:", withVat);

// Фильтрация объекта
const adults = Object.fromEntries(
  Object.entries({ anna: 30, tim: 12, vera: 44 }).filter(([, age]) => age >= 18)
);
console.log("только взрослые:", adults);

// Работает с любыми итерируемыми парами, включая Map
console.log("из Map:", Object.fromEntries(new Map([["x", 1]])));
