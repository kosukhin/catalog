# PHP 8.1 (выпущена 25.11.2021)

## Последние улучшения / новые возможности

- **Enums** — нативные перечисления (Backed enums со скалярными значениями).
- **Readonly-свойства** — присваиваются только один раз.
- **Fibers** — легковесные конкурентные примитивы.
- **Pure intersection types** — пересечения типов (`A&B`).
- **First-class callable syntax** — `strlen(...)`.
- **`never` return type**, `new` в initializers, `array_is_list()`.
- Улучшения производительности: JIT для opcache, наследование констант, `readonly`.

## Запуск

```bash
docker build -t php81-demo .
docker run --rm php81-demo
```