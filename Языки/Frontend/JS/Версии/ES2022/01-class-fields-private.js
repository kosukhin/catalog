// Фича: приватные поля и методы классов (#)
console.log("=== 01. Приватные поля и методы # ===");

class Account {
  #balance = 0;                 // приватное поле
  #transactions = [];           // приватное состояние

  constructor(owner) { this.owner = owner; }

  deposit(amount) {
    if (amount <= 0) throw new Error("сумма должна быть положительной");
    this.#balance += amount;
    this.#log(`+${amount}`);
    return this;
  }

  withdraw(amount) {
    if (amount > this.#balance) throw new Error("недостаточно средств");
    this.#balance -= amount;
    this.#log(`-${amount}`);
    return this;
  }

  get balance() { return this.#balance; }   // публичный доступ только для чтения

  #log(entry) {                              // приватный метод
    this.#transactions.push(entry);
  }

  static #isPositive(n) { return n > 0; }    // статический приватный метод
}

const acc = new Account("Анна");
acc.deposit(100).withdraw(30);
console.log("баланс через геттер:", acc.balance);

// Доступ снаружи — SyntaxError, поэтому проверяем через eval
try {
  eval("acc.#balance");
} catch (e) {
  console.log("доступ к #balance снаружи:", e.name); // SyntaxError
}

// Настоящая инкапсуляция: раньше приходилось прятать в WeakMap или замыкания
console.log("внутренности не видны:", !Object.keys(acc).some(k => k.startsWith("#")));
