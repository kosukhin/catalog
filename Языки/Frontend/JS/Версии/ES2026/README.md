# ES2026

Спецификация ECMAScript® 2026 утверждена Ecma International **30 июня 2026 года**.

**Запуск всех примеров:**

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo
```

> **Примечание:** все фичи ES2026 работают в Node 26 из коробки,
> кроме `Math.sumPrecise` — для него нужен V8-флаг `--js-sum-precise`.

## Примеры

### 01. `Array.fromAsync`

Статический метод, превращающий async-итератор (или синхронный генератор,
выдающий промисы) в массив — аналог `Array.from` для асинхронности.
Раньше приходилось вручную писать `for await` с накоплением в массив.

```js
const arr = await Array.fromAsync(asyncGen(2024, 2026), n => `ECMAScript ${n}`);
```

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo node --js-sum-precise 01-array-from-async.js
```

### 02. `Error.isError`

Надёжная проверка «это ошибка?»: в отличие от `instanceof Error`, не ломается
на кросс-реалм-объектах и не доверяет подделкам (`Object.create(Error.prototype)`).

```js
Error.isError(e);        // true только для настоящих Error
fake instanceof Error;   // true у подделки — ловушка!
```

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo node --js-sum-precise 02-error-is-error.js
```

### 03. `Math.sumPrecise`

Точное суммирование массива чисел без накопления ошибок округления:
`[0.1, 0.2, 0.3].reduce((s, n) => s + n)` даёт `0.6000000000000001`,
а `Math.sumPrecise` — ровно `0.6`.

```js
Math.sumPrecise([0.1, 0.2, 0.3]); // 0.6
```

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo node --js-sum-precise 03-math-sumprecise.js
```

### 04. `Uint8Array.fromBase64` / `toBase64`

Стандартное кодирование/декодирование Base64 для бинарных данных —
без Node-специфичного `Buffer` и костылей вокруг `btoa/atob`.
Поддерживает base64url-алфавит и устойчив к пробелам при декодировании.

```js
const decoded = Uint8Array.fromBase64("SGkh");
const encoded = decoded.toBase64({ alphabet: "base64url" });
```

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo node --js-sum-precise 04-uint8array-base64.js
```

### 05. `Iterator.concat` (Iterator Sequencing)

Ленивое соединение итераторов и массивов в одну последовательность —
без ручного генератора с `yield*`. Работает даже с бесконечными итераторами.

```js
Iterator.concat(iterA, [2024], iterB);
```

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo node --js-sum-precise 05-iterator-concat.js
```

### 06. `JSON.rawJSON` и доступ к исходному тексту JSON

- reviver в `JSON.parse` получает третий аргумент `{ source }` — исходный текст
   значения, что позволяет точно восстанавливать большие числа (`BigInt`);
- `JSON.rawJSON()` в `JSON.stringify` сериализует значение как есть:
   раньше `stringify` падал на BigInt с TypeError.

```js
JSON.parse("999999999999999999", (k, v, { source }) => BigInt(source));
JSON.stringify({ id: 1n }, (k, v) => typeof v === "bigint" ? JSON.rawJSON(v.toString()) : v);
```

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo node --js-sum-precise 06-json-rawjson.js
```

### 07. `Map.getOrInsert` / `getOrInsertComputed` (Upsert)

Вставка значения, только если ключ отсутствует, — без танцев с `has`/`get`.
Вариант с `_Computed` вычисляет дефолт лениво и работает у `WeakMap`.

```js
settings.getOrInsert("theme", "dark");
visits.getOrInsertComputed("anna", () => ({ count: 0 }));
```

```bash
docker build -t es2026-demo . && docker run --rm es2026-demo node --js-sum-precise 07-map-getorinsert.js
```
