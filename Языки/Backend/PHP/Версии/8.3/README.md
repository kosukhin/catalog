# PHP 8.3 (выпущена 23.11.2023)

## Последние улучшения / новые возможности

- **Typed class constants** — типизированные константы классов.
- **`#[\Override]`-атрибут** — явная проверка переопределения родительского метода.
- **Динамическое получение константы класса** `$class::{$name}`.
- __`json_validate()`__ — быстрая валидация JSON без декодирования.
- __`random_bytes`-улучшения, `mb_str_pad()`__, deep-copy-on-write для IteratorAggregate.
- Чтение только при чтении (readonly) клонирование, улучшения anonymous classes и ошибок PHP.

## Запуск

```bash
docker build -t php83-demo .
docker run --rm php83-demo
```