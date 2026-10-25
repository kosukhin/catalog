# ES2022

Классы стали полноценными: приватные члены `#` и статические блоки. Плюс
`.at()`, `Object.hasOwn`, `Error cause` и top-level `await`.

**Запуск всех примеров:**
```bash
docker build -t es2022-demo . && docker run --rm es2022-demo
```

## Примеры

### 01. Приватные поля и методы классов `#`
Настоящая инкапсуляция: `#balance` недоступен снаружи (SyntaxError), доступ
только через публичный API класса. Работает и для статических членов (`static #x`).

```js
class Account {
  #balance = 0;
  #log(entry) { ... }
  get balance() { return this.#balance; }
}
```

```bash
docker build -t es2022-demo . && docker run --rm es2022-demo node 01-class-fields-private.js
```

### 02. Поля и статические блоки классов
Публичные поля объявляются прямо в теле класса (не в конструкторе),
`static` поля принадлежат классу, а `static {}` — блок инициализации с логикой.

```js
class AppConfig {
  version = "2.0";
  static ENV = "production";
  static { AppConfig.ENV = process.env.NODE_ENV ?? "production"; }
}
```

```bash
docker build -t es2022-demo . && docker run --rm es2022-demo node 02-class-fields.js
```

### 03. `.at()` — индексация с отрицательными значениями
`arr.at(-1)` — последний элемент вместо громоздкого `arr[arr.length - 1]`.
Работает с массивами, строками и TypedArray.

```bash
docker build -t es2022-demo . && docker run --rm es2022-demo node 03-at.js
```

### 04. `Object.hasOwn`, `Error cause`, top-level `await`
- `Object.hasOwn(obj, key)` — надёжная проверка собственных свойств в отличие
  от уязвимого `obj.hasOwnProperty()`;
- `new Error(msg, { cause: e })` — проброс ошибки с сохранением причины (`error.cause`);
- top-level `await` — ожидание промиса прямо на верхнем уровне модуля.

```bash
docker build -t es2022-demo . && docker run --rm es2022-demo node 04-hasown-cause.mjs
```
