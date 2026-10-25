// Фича: генераторы (function*) — ленивые последовательности
console.log("=== 12. Генераторы ===");

function* counter() {
  yield 1;
  yield 2;
  return 3; // значение return приходит в .next() с done: true
}
const it = counter();
console.log(it.next(), it.next(), it.next());

function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) { yield a; [a, b] = [b, a + b]; }
}
const fib = fibonacci();
console.log("Фибоначчи:", [fib.next().value, fib.next().value, fib.next().value, fib.next().value, fib.next().value]);

// Генераторы можно итерировать и комбинировать
function* squares(n) { for (let i = 1; i <= n; i++) yield i * i; }
console.log("squares:", [...squares(5)]);
console.log("yield* делегирование:", [...(function* () { yield* [1, 2]; yield* "xy"; })()]);
