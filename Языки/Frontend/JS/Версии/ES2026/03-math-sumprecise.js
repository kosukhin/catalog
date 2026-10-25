// Фича: Math.sumPrecise — точное суммирование без накопления ошибок
// (в Node 26 включается флагом V8: node --js-sum-precise)
console.log("=== 03. Math.sumPrecise ===");

// Классическая проблема сложения чисел с плавающей точкой:
console.log("0.1 + 0.2:", 0.1 + 0.2); // 0.30000000000000004
console.log("reduce в цикле:", [0.1, 0.2, 0.3].reduce((s, n) => s + n, 0)); // 0.6000000000000001

// Math.sumPrecise использует улучшенный алгоритм (Neumaier/precision-preserving)
console.log("sumPrecise:", Math.sumPrecise([0.1, 0.2, 0.3])); // 0.6
console.log("sumPrecise больших:", Math.sumPrecise([1e16, 1, -1e16])); // 1, а не 0!
console.log("наивно:", 1e16 + 1 - 1e16); // 0

// Пустой массив и нечисловые значения
console.log("пустой массив:", Math.sumPrecise([])); // 0
try { Math.sumPrecise([1, "x"]); } catch (e) { console.log("нечисловое:", e.name); } // TypeError
