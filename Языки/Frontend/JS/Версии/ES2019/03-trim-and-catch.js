// Фичи: trimStart/trimEnd и необязательная привязка в catch
console.log("=== 03. trimStart/trimEnd и catch без переменной ===");

const raw = "   Привет   ";
console.log("trimStart:", "[" + raw.trimStart() + "]");
console.log("trimEnd:", "[" + raw.trimEnd() + "]");
console.log("trim (полный):", "[" + raw.trim() + "]");

// Необязательный catch-параметр: если ошибка не нужна — скобки можно опустить
try {
  JSON.parse("{ сломанный json");
} catch {
  console.log("catch без переменной: JSON невалиден");
}

// Когда переменная всё же нужна
try { null.foo; } catch (e) { console.log("catch с переменной:", e.name); }
