// Фича: Iterator Sequencing — Iterator.concat
console.log("=== 05. Iterator.concat ===");

// Раньше соединение итераторов требовало генератора-делегата вручную
const iOne = Iterator.from([2022, 2023]);
const iTwo = Iterator.from([2025, 2026]);

function* combine(...iterators) {
  for (const source of iterators) yield* source;
}
console.log("вручную (yield*):", Array.from(combine(iOne, iTwo)));

// Теперь — статический метод, лениво и без boilerplate
const iThree = Iterator.from([2022, 2023]);
const iFour = Iterator.from([2025, 2026]);
const combined = Iterator.concat(iThree, [2024], iFour);
console.log("Iterator.concat:", Array.from(combined));

// Ленивость: элементы вычисляются по мере продвижения
// Важно: берём .take() ДО разворачивания — иначе бесконечный генератор попытается материализоваться целиком
function* naturals() { let i = 1; while (true) yield i++; }
console.log("ленивое соединение:", [...Iterator.concat(naturals(), naturals()).take(6)]);
