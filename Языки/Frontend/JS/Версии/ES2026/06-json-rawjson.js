// Фича: JSON.parse source text access + JSON.rawJSON
console.log("=== 06. JSON.rawJSON и source text ===");

// Проблема 1: JSON.parse теряет точность больших чисел
console.log("старый parse:", JSON.parse("999999999999999999")); // 1000000000000000000 (!)

// Решение: reviver получает третий аргумент — исходный текст значения
const exact = JSON.parse("999999999999999999", (key, value, { source }) =>
  typeof value === "number" ? BigInt(source) : value
);
console.log("точный parse:", exact, typeof exact);

// Проблема 2: JSON.stringify не умеет BigInt
try { JSON.stringify(9999999999999999n); } catch (e) { console.log("старый stringify:", e.message); }

// Решение: JSON.rawJSON() — значение сериализуется как есть из исходника
console.log("rawJSON:", JSON.stringify({ id: 9999999999999999n }, (key, value) =>
  typeof value === "bigint" ? JSON.rawJSON(value.toString()) : value
));

// Проверка rawJSON-значений
console.log("isRawJSON:", JSON.isRawJSON(JSON.rawJSON("42")));
