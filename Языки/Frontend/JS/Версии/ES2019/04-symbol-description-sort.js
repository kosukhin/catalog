// Фичи: Symbol.description, стабильная сортировка, JSON superset
console.log("=== 04. Прочее из ES2019 ===");

// 1. Symbol.description — доступ к описанию без toString().slice()
const s = Symbol("my-app/id");
console.log("description:", s.description);        // my-app/id
console.log("toString:", s.toString());             // Symbol(my-app/id)

// 2. Стабильная сортировка: порядок равных элементов сохраняется
const rows = [
  { name: "Boris", dept: "dev" },
  { name: "Anna", dept: "dev" },
  { name: "Vera", dept: "hr" },
];
rows.sort((a, b) => a.dept.localeCompare(b.dept));
console.log("стабильный sort:", rows.map(r => `${r.dept}/${r.name}`));
// Boris и Anna (оба dev) сохранили исходный порядок

// 3. JSON superset: U+2028/U+2029 теперь валидны в строках-литералах
console.log("JSON superset:", JSON.parse('"\u2028ok\u2029"'));
