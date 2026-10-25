// Фича: nullish coalescing ?? — дефолт только для null/undefined
console.log("=== 02. Nullish coalescing ?? ===");

// Проблема ||: он подменяет ВСЕ falsy-значения
const volume = 0;      // громкость выключена — это валидное значение!
console.log("|| ломает ноль:", volume || 50);        // 50 — плохо!
console.log("?? корректен:", volume ?? 50);          // 0 — хорошо!

const theme = "";      // пустая строка — тоже валидное значение
console.log("|| ломает строку:", theme || "dark");   // dark
console.log("?? сохраняет:", theme ?? "dark");       // ""

// ?? срабатывает только на null и undefined
console.log("null ?? д:", null ?? "дефолт");
console.log("undefined ?? д:", undefined ?? "дефолт");

// Комбинация с optional chaining — типичный паттерн настроек
const config = { audio: { volume: 0 } };
const vol = config.audio?.volume ?? 30;
console.log("config.audio?.volume ?? 30:", vol);

// Смешивать ?? с ||/&& нужно в скобках
console.log("скобки обязательны:", (0 || 5) ?? "никогда не сработает");
