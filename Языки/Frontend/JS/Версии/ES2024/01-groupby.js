// Фича: Object.groupBy и Map.groupBy — группировка элементов
console.log("=== 01. Object.groupBy / Map.groupBy ===");

const people = [
  { name: "Анна", city: "Москва" },
  { name: "Борис", city: "СПб" },
  { name: "Вера", city: "Москва" },
  { name: "Глеб", city: "Казань" },
];

// Object.groupBy — ключи становятся свойствами объекта
const byCity = Object.groupBy(people, p => p.city);
console.log("Object.groupBy:", byCity);

// Map.groupBy — ключи любого типа (например, числа)
const ages = [15, 22, 17, 30, 19];
const byAgeGroup = Map.groupBy(ages, a => (a >= 18 ? "взрослые" : "дети"));
console.log("Map.groupBy:", [...byAgeGroup]);

// Раньше приходилось писать reduce вручную
const manual = people.reduce((acc, p) => {
  (acc[p.city] ??= []).push(p);
  return acc;
}, {});
console.log("тот же результат вручную:", manual);
