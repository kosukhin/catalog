// Фича: lookbehind-assertions и флаг s (dotAll)
console.log("=== 05. Regex: lookbehind и флаг s ===");

// Lookbehind: (?<=...) — после, (?<!...) — НЕ после. Не входит в результат.
console.log("цена после $:", "$42".match(/(?<=\$)\d+/)[0]);
console.log("число НЕ после $:", "$42 7".match(/(?<!\$)\d+/)[0]);

// Практика: escape-символы в строке-замене
console.log("replace lookbehind:", "foo-bar".replace(/(?<=foo)-/, "_"));

// Флаг s: точка матчит и переводы строк (dotAll)
console.log("без s:", "a\nb".match(/a.b/) === null);
console.log("с s:", "a\nb".match(/a.b/s)[0]);
console.log("флаг s:", "a\nb".match(/a.b/s).dotAll); // true
