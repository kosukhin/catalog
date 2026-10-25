// Фича: иммутабельные методы массивов — toSorted, toReversed, toSpliced, with
console.log("=== 01. toSorted / toReversed / toSpliced / with ===");

const original = [3, 1, 2];

// Старые методы МУТИРОВАЛИ массив, новые возвращают копию
const sorted = original.toSorted();
const reversed = original.toReversed();
const spliced = original.toSpliced(0, 1, "X");
const replaced = original.with(1, "X");   // замена одного элемента

console.log("исходный не изменился:", original);
console.log("toSorted():", sorted, "| toReversed():", reversed);
console.log("toSpliced(0, 1, 'X'):", spliced, "| with(1, 'X'):", replaced);

// Сравнение со старыми (мутирующими) методами
const old = [3, 1, 2];
const oldSorted = old.sort();
console.log("старый sort мутирует:", old === oldSorted); // true!

// Практика: чистая (pure) функция обновления состояния
function toggleTask(tasks, index) {
  return tasks.with(index, { ...tasks[index], done: !tasks[index].done });
}
const tasks = [{ title: "задача 1", done: false }, { title: "задача 2", done: false }];
console.log("после toggle:", toggleTask(tasks, 0));
console.log("state неизменён:", tasks[0].done === false);
