// Фичи: import-атрибуты, regex с дублирующимися группами, /d-флаг
console.log("=== 04. Прочее из ES2025 ===");

// 1. Import-атрибуты: модуль JSON загрузится как объект
import data from "./data.json" with { type: "json" };
console.log("import-атрибуты (json):", data);

// 2. Дублирующиеся именованные группы — валидны при ветвлениях (если имена совпадают с одинаковым значением в каждой ветке)
const re = /(?<year>\d{4})[-/](?<month>\d{2})|(?<year>\d{2})[-/](?<month>\d{2})/;
for (const m of ["2026-10", "26/10"].map(s => s.match(re))) {
  console.log("дублирующиеся группы:", m.groups.year, m.groups.month);
}

// 3. /d-флаг: индексы совпадений в .indices
const withIndices = "abc".match(/(?<x>b)/d);
console.log("/d флаг, индекс группы:", withIndices.indices.groups.x);
