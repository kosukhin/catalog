// Фичи: Object.hasOwn и Error cause
console.log("=== 04. Object.hasOwn и Error cause ===");

const obj = Object.create({ inherited: "прототипное" });
obj.own = "собственное";

// obj.hasOwnProperty() ненадёжен: объект мог переопределить метод или не иметь прототипа
const weird = { hasOwnProperty: () => true };
console.log("hasOwnProperty обманут:", weird.hasOwnProperty("никогда")); // true!
console.log("Object.hasOwn честен:", Object.hasOwn(weird, "никогда"));    // false
console.log("own:", Object.hasOwn(obj, "own"), "| inherited:", Object.hasOwn(obj, "inherited"));

// Error cause — причина ошибки при пробросе (цепочки ошибок)
try {
  try {
    JSON.parse("{ некорректный");
  } catch (e) {
    throw new Error("не удалось загрузить конфигурацию", { cause: e });
  }
} catch (top) {
  console.log("верхняя ошибка:", top.message);
  console.log("причина:", top.cause instanceof SyntaxError && top.cause.message);
}

// Top-level await: await прямо на верхнем уровне модуля
const { randomBytes } = await import("node:crypto");
console.log("top-level await:", randomBytes(4).toString("hex"));
