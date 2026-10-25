// Фича: методы Set — union, intersection, difference, symmetricDifference,
// isSubsetOf, isSupersetOf, isDisjointFrom
console.log("=== 01. Методы Set ===");

const frontend = new Set(["JS", "CSS", "HTML", "TS"]);
const backend = new Set(["JS", "SQL", "Node"]);

// Раньше все операции писались фильтрами вручную
console.log("union:", [...frontend.union(backend)]);                    // объединение
console.log("intersection:", [...frontend.intersection(backend)]);     // пересечение
console.log("difference:", [...frontend.difference(backend)]);         // есть в A, нет в B
console.log("symmetricDifference:", [...frontend.symmetricDifference(backend)]); // только в одном

// Проверки отношений между множествами
console.log("isSubsetOf:", new Set(["JS"]).isSubsetOf(frontend));
console.log("isSupersetOf:", frontend.isSupersetOf(new Set(["JS"])));
console.log("isDisjointFrom:", frontend.isDisjointFrom(new Set(["C++"])));
