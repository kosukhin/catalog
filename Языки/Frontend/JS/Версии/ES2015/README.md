# ES2015 (ES6)

Крупнейшее обновление JavaScript за всю историю: язык получил классы, блоки,
промисы, модули и десятки синтаксических улучшений.

**Запуск всех примеров:**

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo
```

## Примеры

### 01. `let` и `const` — блочная область видимости

`let` и `const` видны только внутри блока `{}` (в отличие от `var`).
`const` запрещает переприсваивание, но не мутацию содержимого.

```js
let scoped = 1;
const FIXED = 20; // FIXED = 30; // TypeError
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 01-let-const.js
```

### 02. Стрелочные функции и лексический `this`

Краткий синтаксис `(a, b) => a + b`. `this` берётся из окружения, а не из
способа вызова — больше не нужен `var self = this`.

```js
const add = (a, b) => a + b;
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 02-arrow-functions.js
```

### 03. Шаблонные строки

Интерполяция ``${expr}``, многострочность и тегированные шаблоны.

```js
console.log(`Привет, ${name}! 2+2=${2 + 2}`);
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 03-template-literals.js
```

### 04. Параметры по умолчанию

Дефолты вместо `user = user || "гость"` и могут зависеть от предыдущих параметров.

```js
function greet(user = "гость") { ... }
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 04-default-params.js
```

### 05. Деструктуризация

Извлечение значений из объектов/массивов, вложенность, дефолты, обмен значений.

```js
const { first, age } = person;
const [a, b, ...rest] = [1, 2, 3, 4, 5];
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 05-destructuring.js
```

### 06. Spread и rest (`...`)

`...args` собирает аргументы в массив; `[...arr]` разворачивает в элементы.

```js
function sum(...nums) { return nums.reduce((s, n) => s + n, 0); }
Math.max(...[5, 9, 2]);
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 06-spread-rest.js
```

### 07. Классы

`class`, `extends`, `super`, геттеры/сеттеры, статические методы.

```js
class Dog extends Animal {
  constructor(name) { super("Собака"); this.name = name; }
}
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 07-classes.js
```

### 08. Map и Set

`Map` — ключи любого типа; `Set` — коллекция уникальных значений.

```js
new Map([["key1", 100]]).set("key2", 200);
[...new Set([1, 2, 2, 3])]; // [1, 2, 3]
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 08-map-set.js
```

### 09. Symbol

Новый примитив: уникальные ключи свойств, скрытые от `Object.keys`.

```js
const ID = Symbol("id");
obj[ID] = 42;
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 09-symbol.js
```

### 10. Promise

Асинхронность через цепочки `then/catch` и комбинаторы `Promise.all` / `race`.

```js
wait(30, "шаг 1").then(v => ...).catch(e => ...);
```

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 10-promise.js
```

### 11. `for...of` и протокол итерации

Итерация строк, Map, массивов и собственных объектов через `Symbol.iterator`.

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 11-for-of.js
```

### 12. Генераторы

`function*` и `yield` — ленивые последовательности (например, бесконечный ряд Фибоначчи).

```bash
docker build -t es2015-demo . && docker run --rm es2015-demo node 12-generators.js
```
