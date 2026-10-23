require("dotenv").config();
const Typesense = require("typesense");

const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || "localhost",
      port: Number(process.env.TYPESENSE_PORT || 8108),
      protocol: process.env.TYPESENSE_PROTOCOL || "http",
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || "xyz",
  connectionTimeoutSeconds: 5,
});

const COLLECTION = "school_events";

const schema = {
  name: COLLECTION,
  fields: [
    { name: "id", type: "string" },
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "category", type: "string", facet: true },
    { name: "location", type: "string" },
    { name: "date", type: "string" },
    { name: "age_group", type: "string", facet: true },
  ],
  default_sorting_field: "date",
};

const docs = [
  { id: "1", title: "Поход в кино", description: "Смотрим новый мультфильм в кинотеатре", category: "Кино", location: "Кинотеатр Октябрь", date: "2026-11-05", age_group: "1-4 класс" },
  { id: "2", title: "Поход на выставку", description: "Экскурсия в музей современного искусства", category: "Выставка", location: "Галерея искусств", date: "2026-11-12", age_group: "5-8 класс" },
  { id: "3", title: "Школьный спектакль", description: "Постановка по сказке Пушкина", category: "Театр", location: "Актовый зал школы", date: "2026-11-20", age_group: "1-11 класс" },
  { id: "4", title: "Спортивный день", description: "Соревнования по футболу и легкой атлетике", category: "Спорт", location: "Школьный стадион", date: "2026-11-25", age_group: "5-11 класс" },
  { id: "5", title: "Научная ярмарка", description: "Проекты учеников по физике и химии", category: "Наука", location: "Школа №42", date: "2026-12-02", age_group: "7-11 класс" },
  { id: "6", title: "Мастер-класс по рисованию", description: "Рисуем акварелью с художником", category: "Творчество", location: "Арт-студия", date: "2026-12-09", age_group: "1-6 класс" },
  { id: "7", title: "Экскурсия в планетарий", description: "Путешествие по звездному небу", category: "Наука", location: "Городской планетарий", date: "2026-12-15", age_group: "3-7 класс" },
  { id: "8", title: "Новогодний бал", description: "Праздничный концерт и дискотека", category: "Праздник", location: "Школьный актовый зал", date: "2026-12-22", age_group: "1-11 класс" },
];

async function main() {
  try {
    await client.collections(COLLECTION).delete();
  } catch (e) {
    // ignore if not exists
  }
  await client.collections().create(schema);
  await client.collections(COLLECTION).documents().import(docs, { action: "create" });
  console.log("Indexed", docs.length, "documents into", COLLECTION);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
