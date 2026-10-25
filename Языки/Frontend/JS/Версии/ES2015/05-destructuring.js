// Фича: деструктуризация объектов, массивов, параметров
console.log("=== 05. Деструктуризация ===");

const person = { first: "Иван", last: "Петров", age: 30 };
const { first, age, city = "Москва" } = person; // с дефолтом
console.log("объект:", first, age, city);

// Переименование и вложенность
const { last: surname, address: { street = "нет" } = {} } = person;
console.log("переименование/вложенность:", surname, street);

const [a, b, ...restArr] = [1, 2, 3, 4, 5]; // массив + rest
console.log("массив:", a, b, restArr);

// Обмен значений без временной переменной
let x = 1, y = 2;
[x, y] = [y, x];
console.log("обмен значений:", x, y);

// Деструктуризация в параметрах функции
function printUser({ first, age }) {
  console.log("в параметрах:", `${first} (${age})`);
}
printUser(person);
