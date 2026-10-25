// Фича: коллекции Map и Set
console.log("=== 08. Map и Set ===");

const m = new Map([["key1", 100]]);
m.set("key2", 200);
m.set({ complex: "ключ" }, "любой тип ключа"); // в отличие от объекта!
console.log("Map:", m.get("key1"), "размер:", m.size);
for (const [k, v] of m) process.stdout.write(`${k}=${v} `);
console.log("");
console.log("has/delete:", m.has("key2"));
m.delete("key2");
console.log("после delete:", m.size);

const s = new Set([1, 2, 2, 3, 3]);
console.log("Set — уникальные значения:", [...s]);
s.add(1);
console.log("дубликат не добавился:", s.size);
console.log("практика: удаление дубликатов:", [...new Set(["a", "b", "a", "c"])]);
