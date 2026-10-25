// Фича: String.prototype.padStart / padEnd
console.log("=== 03. padStart / padEnd ===");

// padStart — классика: выравнивание чисел и маскирование
console.log("5 → 05:", String(5).padStart(2, "0"));
console.log("телефон:", "380671234567".slice(-9).padStart(12, "+380"));
console.log("маска карты:", "1234567812345678".slice(-4).padStart(16, "*"));

// padEnd — выравнивание колонок в таблице
const rows = [["id", "Имя"], ["1", "Анна"], ["42", "Борис"]];
rows.forEach(([a, b]) => console.log(a.padEnd(6) + b.padEnd(10, ".")));

// Без указания символа заполняется пробелами
console.log("[" + "x".padStart(5) + "]");
