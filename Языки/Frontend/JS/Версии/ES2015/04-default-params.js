// Фича: параметры по умолчанию и rest-параметры в сигнатуре
console.log("=== 04. Параметры по умолчанию ===");

function greet(user = "гость", greeting = "Привет") {
  return `${greeting}, ${user}`;
}
console.log(greet(), "|", greet("Анна"), "|", greet("Анна", "Добрый день"));

// Значение по умолчанию может быть выражением и использовать предыдущие параметры
function area(w = 1, h = w * 2) {
  return w * h;
}
console.log("выражения в дефолтах:", area(3), area(3, 10));

// Раньше приходилось писать: user = user || 'гость' — ломалось на falsy-значениях
function count(n = 0) { return n; }
console.log("0 сохраняется:", count(0));
