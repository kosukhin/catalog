# PHP 8.2 (выпущена 08.12.2022)

## Последние улучшения / новые возможности

- **Readonly-классы** — все свойства класса readonly.
- **DNF-типы** (Disjunctive Normal Form) — `A&B|null`.
- **`true`, `false`, `null` как отдельные типы**.
- **Динамические свойства объявлены deprecated**.
- **`#[AllowDynamicProperties]`, `#[SensitiveParameter]` и другие новые атрибуты**.
- **Анонимные readonly-классы**.
- `random_bytes`-расширение Random, `mysqli` именованные плейсхолдеры, устаревание динамических свойств и строковых функций utf8_encode/decode.

## Запуск

```bash
docker build -t php82-demo .
docker run --rm php82-demo
```