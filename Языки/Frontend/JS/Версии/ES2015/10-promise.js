// Фича: Promise — асинхронность без колбэк-ада
console.log("=== 10. Promise ===");

const wait = (ms, value) => new Promise(r => setTimeout(() => r(value), ms));

// Цепочка then/catch вместо вложенных колбэков
wait(30, "шаг 1")
  .then(v => { console.log(v); return wait(30, "шаг 2"); })
  .then(v => { console.log(v); throw new Error("что-то сломалось"); })
  .catch(e => console.log("catch перехватил:", e.message))
  .then(() => console.log("цепочка завершена"));

// Комбинаторы Promise.all и Promise.race
Promise.all([wait(40, "A"), wait(20, "B")])
  .then(v => console.log("all (порядок как в массиве):", v));
Promise.race([wait(50, "медленный"), wait(10, "быстрый")])
  .then(v => console.log("race (первый завершившийся):", v));
