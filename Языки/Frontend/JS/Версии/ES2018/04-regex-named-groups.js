// Фича: именованные группы захвата в регулярных выражениях
console.log("=== 04. Regex: именованные группы ===");

const re = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const m = "2026-10-25".match(re);

console.log("по индексам:", m[1], m[2], m[3]);
console.log("по именам:", m.groups.year, m.groups.month, m.groups.day);

// Деструктуризация групп
const { groups: { year, day } } = m;
console.log("деструктуризация:", year, day);

// replace с именованными группами
console.log("replace:", "2026-10-25".replace(re, "$<day>.$<month>.$<year>"));
