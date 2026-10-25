# ES2025

Методы множеств, helper-методы итераторов, `Promise.try` и импорт JSON.

**Запуск всех примеров:**

```bash
docker build -t es2025-demo . && docker run --rm es2025-demo
```

## Примеры

### 01. Методы Set

Готовые теоретико-множественные операции вместо ручных фильтров:
`union`, `intersection`, `difference`, `symmetricDifference`,
`isSubsetOf`, `isSupersetOf`, `isDisjointFrom`.

```js
frontend.intersection(backend);
```

```bash
docker build -t es2025-demo . && docker run --rm es2025-demo node 01-set-methods.js
```

### 02. Iterator helpers

`map`, `filter`, `take`, `drop`, `flatMap` прямо на итераторах — ленивые
цепочки без библиотек, работают даже с бесконечными итераторами.

```js
natural().map(n => n * n).filter(n => n % 2 === 0).take(5);
```

```bash
docker build -t es2025-demo . && docker run --rm es2025-demo node 02-iterator-helpers.js
```

### 03. `Promise.try`

Оборачивает синхронную или async-функцию в промис: исключение из
синхронного кода гарантированно попадает в `.catch`.

```bash
docker build -t es2025-demo . && docker run --rm es2025-demo node 03-promise-try.js
```

### 04. Прочее: import-атрибуты, regex

- `import data from "./data.json" with { type: "json" }` — импорт JSON как объекта;
- дублирующиеся именованные группы regex и `/d`-флаг (индексы групп).

```bash
docker build -t es2025-demo . && docker run --rm es2025-demo node 04-misc-es2025.mjs
```
