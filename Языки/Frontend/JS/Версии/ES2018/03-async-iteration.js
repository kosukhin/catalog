// Фича: async-итераторы и цикл for await...of
console.log("=== 03. for await...of ===");

const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));

// Асинхронно-генерируемая последовательность
async function* paginated() {
  for (const page of [1, 2, 3]) {
    const data = await wait(20, `страница-${page}`);
    yield data;
  }
}

(async () => {
  for await (const page of paginated()) {
    console.log("получено:", page);
  }
  console.log("все страницы обработаны");
})();
