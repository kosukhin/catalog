# ES2019

Набор удобных методов для массивов, объектов и строк + мелкие исправления
языка.

**Запуск всех примеров:**
```bash
docker build -t es2019-demo . && docker run --rm es2019-demo
```

## Примеры

### 01. `Array.flat` / `Array.flatMap`
`flat(depth)` выравнивает вложенные массивы (можно `Infinity`);
`flatMap` = `map` + `flat(1)` — «один элемент → несколько».

```js
[1, [2, [3]]].flat(Infinity);          // [1, 2, 3]
"привет мир".split(" ").flatMap(w => w.split(""));
```

```bash
docker build -t es2019-demo . && docker run --rm es2019-demo node 01-flat-flatmap.js
```

### 02. `Object.fromEntries`
Обратная операция к `Object.entries`: превращает пары `[ключ, значение]`
(в т.ч. из Map) обратно в объект. Основа функциональных трансформаций словарей.

```js
Object.fromEntries(Object.entries(obj).map(...));
```

```bash
docker build -t es2019-demo . && docker run --rm es2019-demo node 02-from-entries.js
```

### 03. `trimStart`/`trimEnd` и catch без переменной
Явное обрезание пробелов слева/справа; `catch {}` без неиспользуемой переменной.

```bash
docker build -t es2019-demo . && docker run --rm es2019-demo node 03-trim-and-catch.js
```

### 04. Прочее: `Symbol.description`, стабильный sort, JSON superset
- `s.description` — описание символа;
- сортировка массивов стала гарантированно стабильной;
- U+2028/U+2029 валидны в строковых литералах.

```bash
docker build -t es2019-demo . && docker run --rm es2019-demo node 04-symbol-description-sort.js
```
