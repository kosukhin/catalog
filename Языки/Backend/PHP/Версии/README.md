# Версии PHP — последние улучшения

Папка содержит описание улучшений по минорным версиям PHP 8.x. В каждой подпапке:

- `Dockerfile` — образ с соответствующей версией PHP (`php:<версия>-cli`);
- `README.md` — список новых возможностей версии;
- `examples.php` — примеры кода, демонстрирующие новые возможности.

## Структура

| Версия | Дата релиза | Ключевые фичи |
|--------|-------------|----------------|
| [8.0](./8.0) | 2020-11-26 | Named arguments, Attributes, promotion в конструкторе, union types, match, nullsafe |
| [8.1](./8.1) | 2021-11-25 | Enums, readonly-свойства, Fibers, intersection types, never, first-class callable |
| [8.2](./8.2) | 2022-12-08 | Readonly-классы, DNF-типы, литеральные типы true/false/null, SensitiveParameter |
| [8.3](./8.3) | 2023-11-23 | Типизированные константы, #[Override], json_validate(), mb_str_pad(), Randomizer |
| [8.4](./8.4) | 2024-11-21 | Property hooks, asymmetric visibility, new без скобок, array_find/any/all |

## Запуск примеров

```bash
cd 8.1
docker build -t php81-demo .
docker run --rm php81-demo
```
