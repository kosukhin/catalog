// Фича: findLast и findLastIndex — поиск с конца
console.log("=== 02. findLast / findLastIndex ===");

const nums = [10, 20, 30, 20, 50];

// find ищет с начала, findLast — с конца
console.log("find 20:", nums.find(n => n === 20));
console.log("findLast 20:", nums.findLast(n => n === 20));
console.log("findIndex 20:", nums.findIndex(n => n === 20));
console.log("findLastIndex 20:", nums.findLastIndex(n => n === 20));

// Практика: последний вход пользователя в журнал
const events = [
  { user: "anna", type: "login" },
  { user: "boris", type: "logout" },
  { user: "anna", type: "logout" },
];
console.log("последнее событие anna:", events.findLast(e => e.user === "anna"));

// Без совпадений — undefined / -1
console.log("нет совпадений:", nums.findLast(n => n === 999), nums.findLastIndex(n => n === 999));
