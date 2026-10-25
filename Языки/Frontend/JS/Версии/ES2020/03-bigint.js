// Фича: BigInt — произвольно большие целые числа
console.log("=== 03. BigInt ===");

// Number теряет точность за 2^53
console.log("max safe:", Number.MAX_SAFE_INTEGER);              // 9007199254740991
console.log("Number теряет точность:", 9007199254740993);       // ...992!

// BigInt: суффикс n или конструктор
const big = 9007199254740993n;
console.log("BigInt точен:", big);                              // ...993
console.log("typeof:", typeof big);

// Обычная арифметика с большими числами
console.log("big + 1n:", big + 1n);
console.log("2n ** 64n:", 2n ** 64n);

// Смешивать BigInt и Number напрямую нельзя
try { big + 1; } catch (e) { console.log("big + 1:", e.message); }

// Но сравнивать можно, и конвертировать тоже
console.log("сравнение:", 1n < 2, 10n === BigInt(10));
console.log("конверсия:", Number(42n), BigInt(42));
