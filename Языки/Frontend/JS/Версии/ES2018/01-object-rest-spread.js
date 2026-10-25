// Фича: rest/spread для объектов (не только массивов!)
console.log("=== 01. Rest/spread для объектов ===");

const user = { id: 1, name: "Анна", email: "a@x.io", role: "admin" };

// spread — копия объекта + переопределение полей
const updated = { ...user, role: "user" };
console.log("spread:", updated);

// rest — «остаток» объекта при деструктуризации
const { id, ...rest } = user;
console.log("rest после извлечения id:", rest);

// Практика: удаление поля без мутации
const withoutEmail = { ...user, email: undefined };
console.log("без email:", withoutEmail);

// Слияние с приоритетом правого объекта
const defaults = { theme: "light", lang: "ru" };
const prefs = { lang: "en" };
console.log("слияние:", { ...defaults, ...prefs });

// Вложенные объекты копируются по ссылке (неглубоко!)
const deep = { a: { b: 1 } };
const copy = { ...deep };
copy.a.b = 99;
console.log("внимание, неглубоко:", deep.a.b === 99);
