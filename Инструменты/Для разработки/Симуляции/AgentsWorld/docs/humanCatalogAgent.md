# `agents/humanCatalogAgent.ts` — каталог людей

Модель: [models/HumanCatalogAgent.md](models/HumanCatalogAgent.md). Единственный в
мире справочник: люди регистрируются в нём, а любой агент может попросить найти
человека по имени, полу или профессии.

## Что экспортирует

| Экспорт | Назначение |
|---|---|
| `type` | `'HumanCatalogAgent'` |
| `moduleUrl`, `createAgent` | контракт модуля агента |
| `HumanCatalogAgent` | класс |
| `HUMAN_CATALOG_AGENT_ID` | `'HumanCatalogAgent-1'` |
| `CATALOG_REGISTER`, `CATALOG_SEARCH`, `CATALOG_RESULT` | типы сообщений |
| `Gender`, `HumanRecord`, `SearchCriteria`, `CatalogResult` | типы данных |

## Сообщения

| Сообщение | Полезная нагрузка | Что делает каталог |
|---|---|---|
| `catalog-register` | `HumanRecord` (`id`, `name`, `gender`, `profession`) | запоминает человека по адресу `id` |
| `catalog-search` | `{ criteria, replyTo }` | ищет по условиям и отвечает `catalog-result` на `replyTo` |
| `catalog-result` | `CatalogResult` | это ответ, его отправляет каталог, а не он получает |

`criteria` — частичное совпадение: пустое поле значит «не важно», пустой объект
возвращает всех. Неизвестные поля и мусор в них игнорируются.

## Почему нужна регистрация

Каталог не может «посмотреть» на других акторов: у акторов нет общей памяти и
списка соседей. Всё, что каталог знает, пришло ему сообщениями. Поэтому
`HumanAgent` при старте отправляет `catalog-register` со своими свойствами — это
часть поведения человека, а не каталога.

## Инварианты

- Ключ хранения — адрес человека (`id`); повторная регистрация с тем же адресом
  обновляет запись, а не дублирует её.
- Регистрация без `id`, `name`, `gender` (кроме «мужчина»/«женщина») или
  `profession` — исключение с понятным текстом; запись не сохраняется.
- Поиск без `replyTo` отвечает только строкой в лог: молча терять результат нельзя.
- На незнакомое сообщение — строка в лог, без падения.

## Тест

`test/humanCatalogAgent.test.ts` — контракт модуля, регистрация и `size`, поиск по
каждому свойству и их сочетанию, пустые условия, ответ спрашивающему, отказ без
`replyTo`, отказ на битую регистрацию, незнакомое сообщение.

## Разложение на подмодули

| Подмодуль | Что содержит |
|---|---|
| `agents/catalog/messages.ts` | адрес каталога и типы сообщений (`CATALOG_REGISTER`, `CATALOG_SEARCH`, `CATALOG_RESULT`) |
| `agents/catalog/types.ts` | `Gender`, `HumanRecord`, `SearchCriteria`, `CatalogResult` |
| `agents/catalog/request.ts` | `readRecord`, `readCriteria`, `readReplyTo`, `humanParts` |

Класс держит `#humans` и методы `state()`, `search`, `handle`, `describe`. Геттер
`size` убран: число записей отдаёт `state().known` (и `status-request`).

## Тест

`test/humanCatalogAgent.test.ts` — регистрация людей, поиск по имени, полу и
профессии, ответ на `catalog-search`, поведение без обратного адреса, вал��дация
записей.
