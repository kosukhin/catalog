# ES2017

Годовая версия, перевернувшая асинхронный JavaScript: `async/await`.

**Запуск всех примеров:**

```bash
docker build -t es2017-demo . && docker run --rm es2017-demo
```

## Примеры

### 01. `async/await`

Асинхронный код в синхронном стиле: `await` паузит выполнение функции до
завершения промиса, `try/catch` ловит ошибки. Для параллельности по-прежнему
нужны `Promise.all` и т.п.

```js
async function main() {
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
}
```

```bash
docker build -t es2017-demo . && docker run --rm es2017-demo node 01-async-await.js
```

### 02. `Object.values` и `Object.entries`

`Object.values` возвращает массив значений, `Object.entries` — пары
`[ключ, значение]`, удобные для сортировки и трансформаций словарей.

```js
Object.entries({ anna: 95 }).map(([name, score]) => `${name}: ${score}`);
```

```bash
docker build -t es2017-demo . && docker run --rm es2017-demo node 02-object-values-entries.js
```

### 03. `padStart` / `padEnd`

Дополнение строки до нужной длины: ведущие нули, маскирование данных,
выравнивание колонок.

```js
String(5).padStart(2, "0");     // "05"
"1234".padEnd(8, "*");           // "1234****"
```

```bash
docker build -t es2017-demo . && docker run --rm es2017-demo node 03-string-padding.js
```

### 04. Прочее: trailing commas, getOwnPropertyDescriptors, SharedArrayBuffer

- запятые в конце списков аргументов и параметров;
- `Object.getOwnPropertyDescriptors` — копирование геттеров/сеттеров;
- `SharedArrayBuffer`/`Atomics` — разделяемая память (в новых Node — с флагом `--harmony`).

```bash
docker build -t es2017-demo . && docker run --rm es2017-demo node 04-misc-es2017.js
```
