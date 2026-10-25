# ES2021

`replaceAll`, `Promise.any`, логическое присваивание и читаемые числа.

**Запуск всех примеров:**

```bash
docker build -t es2021-demo . && docker run --rm es2021-demo
```

## Примеры

### 01. `String.prototype.replaceAll`

Замена **всех** вхождений подстроки (или regex с флагом `g`), а не только
первого, как это делал `replace` со строковым аргументом.

```js
"a-a-a".replaceAll("-", "+"); // "a+a+a"
```

```bash
docker build -t es2021-demo . && docker run --rm es2021-demo node 01-replace-all.js
```

### 02. `Promise.any`

Возвращает первый **успешный** (fulfilled) промис, игнорируя отклонённые
(в отличие от `race`, который берёт первый завершившийся любой ценой).
Если все отклонены — `AggregateError` со списком ошибок в `.errors`.

```bash
docker build -t es2021-demo . && docker run --rm es2021-demo node 02-promise-any.js
```

### 03. Логическое присваивание `||=`, `&&=`, `??=`

Сокращения вида `x = x || y`:

- `||=` — присвоить, если текущее значение falsy;
- `&&=` — присвоить, если truthy;
- `??=` — присвоить, только если `null`/`undefined` (не трогает `0` и `""`).

```js
opts.timeout ??= 5000;
```

```bash
docker build -t es2021-demo . && docker run --rm es2021-demo node 03-logical-assignment.js
```

### 04. Числовые разделители `_`

Визуальное разделение разрядов в литералах: `1_000_000_000`,
`0b1010_0001`, `0xFF_FF`. На значение не влияют.

```bash
docker build -t es2021-demo . && docker run --rm es2021-demo node 04-numeric-separators.js
```
