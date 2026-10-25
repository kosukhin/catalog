// Фича: Array.prototype.flat и flatMap
console.log("=== 01. flat / flatMap ===");

const nested = [1, [2, 3], [4, [5, 6]]];
console.log("flat():", nested.flat());        // глубина 1
console.log("flat(2):", nested.flat(2));      // глубина 2
console.log("flat(Infinity):", nested.flat(Infinity)); // полностью

// flatMap = map + flat(1): удобен для «один → много»
const words = ["привет мир", "как дела"];
console.log("flatMap:", words.flatMap(w => w.split(" ")));

// Практика: развернуть вложенные комментарии
const threads = [["a1", ["a2"]], ["b1"]];
console.log("комментарии:", threads.flat(Infinity));
