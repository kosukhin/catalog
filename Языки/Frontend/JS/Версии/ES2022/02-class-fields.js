// Фичи: публичные и статические поля классов, статические блоки
console.log("=== 02. Поля и статические блоки классов ===");

class AppConfig {
  // Поля класса — раньше приходилось объявлять в constructor
  version = "2.0";
  debug = false;

  // Статические поля — принадлежат классу, а не экземпляру
  static ENV = "production";
  static instances = 0;

  // Статический блок — инициализация с логикой при загрузке класса
  static {
    if (process.env.NODE_ENV === "test") AppConfig.ENV = "test";
    console.log("статический блок: ENV =", AppConfig.ENV);
  }

  constructor(debug) {
    this.debug = debug;
    AppConfig.instances++;
  }
}

console.log("поля экземпляра:", new AppConfig(true));
console.log("статические поля:", AppConfig.ENV, "| экземпляров:", AppConfig.instances);
const a = new AppConfig(false);
console.log("счётчик экземпляров:", AppConfig.instances);
