const fs = require("fs");
const path = require("path");

const categories = ["Кино", "Выставка", "Театр", "Спорт", "Наука", "Творчество", "Праздник", "Экскурсия", "Мастер-класс", "Концерт", "Лекция", "Квест", "Олимпиада", "Фестиваль"];
const locations = ["Кинотеатр Октябрь", "Галерея искусств", "Актовый зал школы", "Школьный стадион", "Школа №42", "Арт-студия", "Городской планетарий", "Дом культуры", "Музей истории", "Библиотека", "Парк Горького", "Театр юного зрителя"];
const ageGroups = ["1-4 класс", "3-7 класс", "5-8 класс", "7-11 класс", "1-11 класс", "1-6 класс", "9-11 класс"];
const subjects = ["математика", "физика", "химия", "биология", "история", "литература", "английский", "информатика", "география", "музыка"];
const adjectives = ["увлекательный", "познавательный", "творческий", "спортивный", "научный", "праздничный", "интерактивный", "командный"];

function pick(arr, i, salt = 0) {
  return arr[(i * 37 + salt * 13) % arr.length];
}

const docs = [];
for (let i = 1; i <= 1000; i++) {
  const cat = pick(categories, i);
  const adj = pick(adjectives, i, 1);
  const subj = pick(subjects, i, 2);
  const title = `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${cat.toLowerCase()} по ${subj} #${i}`;
  const description = `Школьное событие: ${cat.toLowerCase()} для ${pick(ageGroups, i)}. Тема: ${subj}. Место: ${pick(locations, i)}.`;
  const day = String((i * 7 % 28) + 1).padStart(2, "0");
  const month = String((i * 3 % 12) + 1).padStart(2, "0");
  const date = `2026-${month}-${day}`;
  docs.push({
    id: String(i),
    title,
    description,
    category: cat,
    location: pick(locations, i),
    date,
    age_group: pick(ageGroups, i),
  });
}

fs.writeFileSync(path.join(__dirname, "..", "data", "events.json"), JSON.stringify(docs, null, 2));
console.log("Generated", docs.length, "events");

