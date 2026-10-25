# ES2023

Версия «change by copy»: иммутабельные методы массивов и поиск с конца.

**Запуск всех примеров:**

```bash
docker build -t es2023-demo . && docker run --rm es2023-demo
```

## Примеры

### 01. Иммутабельные методы массивов

`toSorted`, `toReversed`, `toSpliced`, `with` возвращают **новый** массив,
не изменяя исходный (старые `sort`/`reverse`/`splice` мутировали на месте).
Идеально для чистых функций и React-подобного управления состоянием.

```js
const next = tasks.with(index, { ...tasks[index], done: true });
```

```bash
docker build -t es2023-demo . && docker run --rm es2023-demo node 01-immutable-methods.js
```

### 02. `findLast` / `findLastIndex`

Поиск последнего совпадения без `reverse().find()` и без ручного цикла с конца.

```bash
docker build -t es2023-demo . && docker run --rm es2023-demo node 02-findlast.js
```

### 03. Прочее: WeakMap с Symbol-ключами, hashbang

- `WeakMap` теперь принимает `Symbol` в качестве ключей;
- `#!/usr/bin/env node` — валидная строка в начале JS-файла.

```bash
docker build -t es2023-demo . && docker run --rm es2023-demo node 03-weakmap-symbol-hashbang.js
```
