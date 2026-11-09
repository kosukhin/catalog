# `server/app.ts` — express-приложение и дашборд

HTTP-слой: API для дашборда и раздача статики.

## Маршруты

| Маршрут | Что отдаёт |
|---|---|
| `GET /` | дашборд `server/public/index.html` |
| `GET /physics.html` | страница физики (three.js) `server/public/physics.html` |
| `GET /api/world` | `{ running, threadCount, total, byType, clock }` |
| `GET /api/agents?page=&pageSize=&search=` | `{ page, pageSize, pages, total, items }` |
| `GET /api/physics` | состояние `PhysicsAgent`: `{ speed, stepSeconds, minDistance, arriveDistance, bounds, bodies, moving }` |

`items[]` — `{ id, type, alive, details }`; `details` — то, что агент рассказал о
себе (`name`, `gender`, `profession`, `state`, `phase` у человека; `timeScale`,
`weekday`, `hours` у времени; `known` у каталога).

## Поиск и пагинация

- `search` ищет подстроку без учёта регистра по `id`, `type` и всем значениям
  `details`. Пример: `?search=врач`, `?search=Иван`, `?search=спит`.
- `pageSize` ограничен 200, чтобы один запрос не вытянул весь мир; по умолчанию
  берётся из конфигурации (20).
- `page` подтягивается к допустимому диапазону: `page=99` при двух страницах
  вернёт вторую, `page=0` — первую.
- `pages` не бывает меньше 1: пустой результат — это одна пустая страница.

## Дашборд

`server/public/index.html` — одна страница без сборки и зависимостей: карточки по
типам агентов, состояние мира и виртуальное время в шапке, поиск, размер страницы,
кнопки «назад/вперёд» и таблица агентов. Обновление раз в 2 секунды; строка с
красной точкой означает «агент не ответил на запрос состояния».

## Страница физики (three.js)

`server/public/physics.html` показывает всё, что знает `PhysicsAgent`: сфера и
подпись на каждое тело, подсветка движущихся, wireframe-коробка `bounds`, сетка и
панель с `speed`, числом тел, движущихся, `minDistance`, `arriveDistance` и
границами. Обзор мышью (поворот/приближение). Ссылка — с главного дашборда.

Клиент написан на TypeScript (`client/`) и собирается в `server/public/physics.js`
через esbuild (`npm run build:client`; `npm start` собирает автоматически). three.js
подключён в бандл, поэтому отдельных зависимостей в браузере не требуется.

## Почему модуль не знает агентов

Приложение работает с `WorldQuery` (`server/snapshot.ts`), поэтому тесты поднимают
его на заглушке мира без потоков, а замена состава агентов не требует правок в
HTTP-слое.

## Тест

`test/server-app.test.ts` — сводка мира, пагинация (страницы, размер, границы),
поиск по состоянию, пустой результат, раздача дашборда по `/`, состояние физики по
`/api/physics`.
