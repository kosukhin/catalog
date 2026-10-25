// Фича: Promise.prototype.finally — код, выполняющийся всегда
console.log("=== 02. Promise.finally ===");

const wait = (ms, value) => new Promise(r => setTimeout(() => r(value), ms));

async function demo(label, fail) {
  console.log(label + ": начинаем...");
  try {
    const r = await wait(30, "данные");
    if (fail) throw new Error("сбой запроса");
    console.log("успех:", r);
  } catch (e) {
    console.log("ошибка:", e.message);
  } finally {
    console.log("finally: прячем лоадер (выполняется всегда)");
  }
}

demo("кейс 1", false);
demo("кейс 2", true);
