// Фича: Upsert — Map.getOrInsert / WeakMap.getOrInsert
console.log("=== 07. Map.getOrInsert ===");

const settings = new Map();
settings.set("language", "en");

// Раньше: танец с проверками
// if (!settings.has("theme")) settings.set("theme", "dark");
console.log("getOrInsert нового ключа:", settings.getOrInsert("theme", "dark")); // dark
console.log("getOrInsert существующего:", settings.getOrInsert("language", "pl")); // en — не перезаписал!
console.log("итоговая карта:", [...settings]);

// Вариант с функцией — вычисление дефолта лениво
const visits = new Map();
console.log("getOrInsertComputed:", visits.getOrInsertComputed("anna", () => ({ count: 0 })));
visits.get("anna").count++;
console.log("повторный вызов тот же объект:", visits.getOrInsertComputed("anna", () => ({ count: 999 })) === visits.get("anna"));

// Практика: счётчики без ручных проверок
function tally(word) {
  const counts = new Map();
  for (const ch of word) counts.set(ch, counts.getOrInsert(ch, 0) + 1);
  return counts;
}
console.log("счётчик букв:", [...tally("мир мир")]);
