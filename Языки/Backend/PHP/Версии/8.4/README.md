# PHP 8.4 (выпущена 21.11.2024)

## Последние улучшения / новые возможности

- **Property hooks** — хуки свойств `get`/`set` (виртуальные свойства) вместо геттеров/сеттеров.
- **Asymmetric visibility** — раздельная видимость `public private(set)`.
- **Новый без JIT-ядра и цепочки вызовов**, гибкие цепочки `(new Foo())->bar()->baz()` без скобок.
- **`new MyClass()->method()` без круглых скобок**.
- **Deprecated-функции**: неявные nullable-типы параметров; `mb_convert_encoding` и др.
- **`array_find()`, `array_any()`, `array_all()`**, `bcround()`/`bcpowmod`-функции, `RoundingMode` enum для round().
- Запросы SQLite/HTTP: `request_parse_body()` и др.

## Запуск

```bash
docker build -t php84-demo .
docker run --rm php84-demo
```