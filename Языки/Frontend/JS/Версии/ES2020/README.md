# ES2020

Годовое обновление, ставшее ежедневным инструментом: `?.`, `??`, `BigInt`,
`Promise.allSettled`, dynamic `import()`.

**Запуск всех примеров:**
```bash
docker build -t es2020-demo . && docker run --rm es2020-demo
```

## Примеры

### 01. Optional chaining `?.`
Безопасный доступ к вложенным свойствам/методам: если промежуточное значение
`null`/`undefined` — результат `undefined` вместо TypeError. Работает с
методами (`?.()`), индексами (`?.[]`), короткое замыкание.

```js
user.profile?.address?.city;
api.fetch?.();
```

```bash
docker build -t es2020-demo . && docker run --rm es2020-demo node 01-optional-chaining.js
```

### 02. Nullish coalescing `??`
Дефолт **только** для `null`/`undefined` — в отличие от `||`, который ломает
валидные falsy-значения (`0`, `""`, `false`).

```js
const vol = config.audio?.volume ?? 30; // 0 останется 0
```

```bash
docker build -t es2020-demo . && docker run --rm es2020-demo node 02-nullish-coalescing.js
```

### 03. BigInt
Целые числа произвольной длины: суффикс `n` или `BigInt()`. Точность там,
где `Number` теряет значимость после 2^53. Смешивать с Number в арифметике
нельзя, сравнивать — можно.

```js
9007199254740993n + 1n; // точно
```

```bash
docker build -t es2020-demo . && docker run --rm es2020-demo node 03-bigint.js
```

### 04. `Promise.allSettled`
Дожидается **всех** промисов и возвращает массив `{status, value|reason}` —
в отличие от `all`, который падает на первой ошибке.

```bash
docker build -t es2020-demo . && docker run --rm es2020-demo node 04-promise-allsettled.js
```

### 05. Прочее: `globalThis`, `matchAll`, dynamic `import()`, `import.meta`
- `globalThis` — платформо-независимый глобальный объект;
- `matchAll` — все совпадения regex с группами;
- `import()` — асинхронная динамическая загрузка модулей;
- `import.meta` — метаданные текущего модуля.

```bash
docker build -t es2020-demo . && docker run --rm es2020-demo node 05-misc-es2020.mjs
```
