// Фичи: globalThis, matchAll, dynamic import(), import.meta
console.log("=== 05. Прочее из ES2020 ===");

// 1. globalThis — единый доступ к глобальному объекту в браузере и Node
console.log("globalThis === global:", globalThis === global);

// 2. matchAll — все совпадения с группами сразу (возвращает итератор)
const text = "2026-01-15 и 2026-07-03";
const dates = [...text.matchAll(/(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/g)];
console.log("matchAll:", dates.map(m => m.groups.y));

// 3. import.meta — метаданные модуля
console.log("import.meta.url:", import.meta.url);

// 4. dynamic import() — модуль загружается по требованию (async)
const { readFile } = await import("node:fs/promises");
console.log("dynamic import():", typeof readFile === "function");
