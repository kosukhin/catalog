# ES2024

Группировка коллекций, удобные резолверы промисов и работа с Unicode.

**Запуск всех примеров:**

```bash
docker build -t es2024-demo . && docker run --rm es2024-demo
```

## Примеры

### 01. `Object.groupBy` / `Map.groupBy`

Встроенная группировка коллекций по произвольному ключу — вместо ручного
`reduce`. `Map.groupBy` позволяет ключи любого типа.

```js
Object.groupBy(people, p => p.city);
Map.groupBy(ages, a => (a >= 18 ? "взрослые" : "дети"));
```

```bash
docker build -t es2024-demo . && docker run --rm es2024-demo node 01-groupby.js
```

### 02. `Promise.withResolvers`

Возвращает `{ promise, resolve, reject }` — больше не нужен обходной путь
с присваиванием резолвера внутри конструктора.

```js
const { promise, resolve } = Promise.withResolvers();
resolve("готово");
```

```bash
docker build -t es2024-demo . && docker run --rm es2024-demo node 02-promise-withresolvers.js
```

### 03. Unicode и буферы

- `isWellFormed`/`toWellFormed` — проверка/починка строк с обломанными суррогатными парами;
- resizable `ArrayBuffer` — изменение размера буфера;
- regex `/v` — продвинутые наборы символов (`\p{RGI_Emoji}`).

```bash
docker build -t es2024-demo . && docker run --rm es2024-demo node 03-unicode-and-buffers.js
```
