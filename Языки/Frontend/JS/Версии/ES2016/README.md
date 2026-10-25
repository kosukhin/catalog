# ES2016

Первая «маленькая» годовая версия — всего две фичи, но обе очень полезные.

**Запуск всех примеров:**
```bash
docker build -t es2016-demo . && docker run --rm es2016-demo
```

## Примеры

### 01. `Array.prototype.includes`
Проверка наличия элемента, читаемая вместо загадочного `arr.indexOf(x) !== -1`.
Главное отличие — корректно находит `NaN` и обрабатывает отрицательный второй
аргумент (позиция начала поиска).

```js
[1, 2, 3].includes(2);  // true
[NaN].includes(NaN);    // true, а indexOf(NaN) === -1
```

```bash
docker build -t es2016-demo . && docker run --rm es2016-demo node 01-array-includes.js
```

### 02. Оператор возведения в степень `**`
Инфиксный аналог `Math.pow`, правоассоциативный, с сокращённой формой `**=`.

```js
3 ** 4;      // 81
2 ** 3 ** 2; // 512 (правоассоциативно)
x **= 5;     // x = x ** 5
```

```bash
docker build -t es2016-demo . && docker run --rm es2016-demo node 02-exponent-operator.js
```
