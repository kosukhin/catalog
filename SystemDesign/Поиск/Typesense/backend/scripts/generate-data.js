const fs = require("fs");
const path = require("path");

const categories = ["Кино", "Выставка", "Театр", "Спорт", "Наука", "Творчество", "Праздник", "Экскурсия", "Мастер-класс", "Концерт"];
const locations = ["Кинотеатр Октябрь", "Галерея искусств", "Актовый зал школы", "Школьный стадион", "Школа №42", "Арт-студия", "Городской планетарий", "Дом культуры", "Музей истории", "Библиотека"];
const ageGroups = ["1-4 класс", "3-7 класс", "5-8 класс", "7-11 класс", "1-11 класс", "1-6 класс"];
const titles = ["Поход в кино", "Поход на выставку", "Школьный спектакль", "Спортивный день", "Научная ярмарка", "Мастер-класс по рисованию", "Экскурсия в планетарий", "Новогодний бал", "Концерт хора", "Встреча с писателем", "Олимпиада по математике", "День открытых дверей"];

const docs = [];
for (let i = 1; i <= 1000; i++) {
  const cat = categories[i % categories.length];
  const title = titles[i % titles.length] + " #" + i;
  const day = String((i % 28) + 1).padStart(2, "0");
  const month = String(((i % 12) + 1)).padStart(2, "0");
  const date = `2026-${month}-${day}`;
  docs.push({
    id: String(i),
    title,
    description: `Тестовое школьное событие категории ${cat}`,
    category: cat,
    location: locations[i % locations.length],
    date,
    age_group: ageGroups[i % ageGroups.length],
  });
}

fs.writeFileSync(path.join(__dirname, "..", "data", "events.json"), JSON.stringify(docs, null, 2));
console.log("Generated", docs.length, "events");
