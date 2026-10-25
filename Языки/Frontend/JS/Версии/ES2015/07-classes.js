// Фича: классы, наследование, super, геттеры/сеттеры, статические методы
console.log("=== 07. Классы ===");

class Animal {
  constructor(kind) { this.kind = kind; }
  speak() { return `${this.kind} издаёт звук`; }
  static isAnimal(obj) { return obj instanceof Animal; } // статический метод
  get label() { return `[${this.kind}]`; }               // геттер
}
class Dog extends Animal {
  constructor(name) {
    super("Собака"); // обязателен до this
    this.name = name;
  }
  speak() { return `${this.name}: Гав!`; }
}

const dog = new Dog("Рекс");
console.log(dog.speak(), dog.label, "| статический:", Animal.isAnimal(dog));
console.log("new Animal('Кот').speak():", new Animal("Кот").speak());
