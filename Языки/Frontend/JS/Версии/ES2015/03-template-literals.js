// Фича: шаблонные строки (интерполяция + многострочность)
console.log("=== 03. Шаблонные строки ===");

const name = "Мир";
console.log(`Привет, ${name}! 2+2=${2 + 2}`);

const html = `
  <div class="card">
    <h1>${name}</h1>
  </div>
`;
console.log("многострочность без \\n:", html.trim());

// Тегированные шаблоны
function emphasize(strings, ...values) {
  return strings.reduce((out, s, i) =>
    out + s + (values[i] !== undefined ? "**" + values[i] + "**" : ""), "");
}
console.log("тегированный шаблон:", emphasize`Результат: ${100 * 2} баллов`);
