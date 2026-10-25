// Фича: логические операторы присваивания ||=, &&=, ??=
console.log("=== 03. Логическое присваивание ===");

// ||= — присвоить, если значение falsy
let name = null;
name ||= "аноним";
console.log("||=:", name);
name ||= "не перезапишет falsy уже есть"; // 'аноним' — truthy, не меняется
console.log("||= повторно:", name);

// &&= — присвоить, если значение truthy
let ready = "да";
ready &&= "готово";
console.log("&&=:", ready);
let notReady = null;
notReady &&= "готово";
console.log("&&= на null:", notReady); // null

// ??= — присвоить, если null/undefined (самый полезный)
let vol = 0;
vol ??= 30;
console.log("??= не трогает ноль:", vol); // 0
let theme;
theme ??= "dark";
console.log("??= дефолт:", theme);

// Практика: выставление дефолтов в объекте
const opts = { retries: 0, timeout: undefined };
opts.retries ??= 3;
opts.timeout ??= 5000;
opts.user ??= "guest";
console.log("дефолты объекта:", opts);
