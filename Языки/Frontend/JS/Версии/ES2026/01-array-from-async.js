// Фича: Array.fromAsync — массив из async-итератора или генератора промисов
console.log("=== 01. Array.fromAsync ===");

// До ES2026: только ручной for await...
async function* asyncGen(start, end) {
  for (let i = start; i <= end; i++) yield i;
}

const arrOne = [];
for await (const n of asyncGen(2024, 2026)) arrOne.push(`ECMAScript ${n}`);
console.log("for await (ручной):", arrOne);

// Теперь — один статический метод, с маппером как у Array.from
const arrTwo = await Array.fromAsync(asyncGen(2024, 2026), n => `ECMAScript ${n}`);
console.log("Array.fromAsync + mapper:", arrTwo);

// Работает и с синхронным генератором, который выдаёт промисы
function* promiseGen(start, end) {
  for (let i = start; i <= end; i++) yield Promise.resolve(i);
}
const arrThree = await Array.fromAsync(promiseGen(2024, 2026), n => `ECMAScript ${n}`);
console.log("генератор промисов:", arrThree);
