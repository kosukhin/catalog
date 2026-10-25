# ES2018

Spread/rest добрались до объектов, промисы получили `finally`, а регулярные
выражения — именованные группы и lookbehind.

**Запуск всех примеров:**

```bash
docker build -t es2018-demo . && docker run --rm es2018-demo
```

## Примеры

### 01. Rest/spread для объектов

`{ ...obj }` — копия/слияние объектов, `{ id, ...rest }` — извлечение части
полей с остатком. Копирование неглубокое (вложенные объекты — по ссылке).

```js
const updated = { ...user, role: "user" };
const { id, ...rest } = user;
```

```bash
docker build -t es2018-demo . && docker run --rm es2018-demo node 01-object-rest-spread.js
```

### 02. `Promise.finally`

Блок, выполняющийся после завершения промиса независимо от результата —
классический «спрятать лоадер».

```js
promise.finally(() => hideLoader());
```

```bash
docker build -t es2018-demo . && docker run --rm es2018-demo node 02-promise-finally.js
```

### 03. Async-итераторы и `for await...of`

`async function*` + `for await` — последовательная обработка потоков/страниц,
где каждый шаг асинхронный.

```js
for await (const page of paginated()) { ... }
```

```bash
docker build -t es2018-demo . && docker run --rm es2018-demo node 03-async-iteration.js
```

### 04. Regex: именованные группы `(?<name>...)`

Захваты по имени вместо магических индексов + их использование в `replace`.

```js
"2026-10-25".match(/(?<year>\d{4})-(?<month>\d{2})/).groups.year;
```

```bash
docker build -t es2018-demo . && docker run --rm es2018-demo node 04-regex-named-groups.js
```

### 05. Regex: lookbehind и флаг `s` (dotAll)

`(?<=...)` / `(?<!...)` — проверки «до» без захвата. Флаг `s` делает точку
матчером и переводов строк.

```bash
docker build -t es2018-demo . && docker run --rm es2018-demo node 05-regex-lookbehind-dotall.js
```
