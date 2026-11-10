# Документация AgentsWorld

Один модуль — один файл документации. Файлы названы так же, как модули.
Тесты лежат в `test/` и названы `<модуль>.test.ts`.

## Правило размера модуля

| Что за модуль | Лимит |
|---|---|
| модуль с классом | один файл — один класс: ≤ 4 свойств и ≤ 3 методов (без конструктора) |
| модуль без класса | ≤ 4 констант **или** ≤ 3 функций |

Геттеров и сеттеров в коде нет: состояние актора читается методом `state()` или
запросом `status-request`. Крупные модули разложены на подмодули в поддиректориях
(`lib/protocol/`, `lib/pool/`, `lib/world/`, `lib/runtime/`, `lib/roster/`,
`agents/human/`, `agents/physics/`, `agents/toilet/`, `agents/house/`, `agents/bank/`,
`agents/day/`, `agents/tick/`, `agents/bulletin/`, `client/physics/`).

## Ядро (`lib/`) — не знает агентов моделей (+ служебный реестр)

| Модуль | Документация | Тест |
|---|---|---|
| `lib/protocol/message.ts` | [protocol.md](protocol.md) | `test/protocol.test.ts` |
| `lib/protocol/names.ts` | [protocol.md](protocol.md) | `test/protocol.test.ts` |
| `lib/protocol/worker.ts` | [protocol.md](protocol.md) | `test/protocol.test.ts` |
| `lib/mailbox.ts` | [mailbox.md](mailbox.md) | `test/mailbox.test.ts` |
| `lib/actor.ts` | [actor.md](actor.md) | `test/actor.test.ts` |
| `lib/actorRuntime.ts` | [actorRuntime.md](actorRuntime.md) | `test/actorRuntime.test.ts` |
| `lib/runtime/createContext.ts` | [actorRuntime.md](actorRuntime.md) | `test/actorRuntime.test.ts` |
| `lib/runtime/pump.ts` | [actorRuntime.md](actorRuntime.md) | `test/actorRuntime.test.ts` |
| `lib/stats.ts` | [stats.md](stats.md) | `test/stats.test.ts` |
| `lib/agentPlugin.ts` | [agentPlugin.md](agentPlugin.md) | `test/agentPlugin.test.ts` |
| `lib/agentLoader.ts` | [agentLoader.md](agentLoader.md) | `test/agentLoader.test.ts` |
| `lib/threadPool.ts` | [threadPool.md](threadPool.md) | `test/threadPool.test.ts` |
| `lib/pool/poolSize.ts` | [threadPool.md](threadPool.md) | `test/threadPool.test.ts` |
| `lib/pool/workerSet.ts` | [threadPool.md](threadPool.md) | `test/threadPool.test.ts` |
| `lib/workerEntry.ts` | [workerEntry.md](workerEntry.md) | `test/workerEntry.test.ts` |
| `lib/world.ts` | [world.md](world.md) | `test/world.test.ts` |
| `lib/world/routes.ts` | [world.md](world.md) | `test/world.test.ts` |
| `lib/world/waitFor.ts` | [world.md](world.md) | `test/world.test.ts` |
| `lib/world/pendingReplies.ts` | [world.md](world.md) | `test/world.test.ts` |
| `lib/rosterAgent.ts` | [rosterAgent.md](rosterAgent.md) | `test/rosterAgent.test.ts` |
| `lib/roster/entries.ts` | [rosterAgent.md](rosterAgent.md) | `test/rosterAgent.test.ts` |
| `lib/roster/readRequest.ts` | [rosterAgent.md](rosterAgent.md) | `test/rosterAgent.test.ts` |
| `lib/index.ts` | [index.md](index.md) | `test/index.test.ts` |

## Агенты (`agents/`) — подключаются снаружи

Модели описаны в [models/](models/), реализация — в `agents/`.

| Модуль | Документация | Тест | Импортов |
|---|---|---|---|
| `agents/echoAgent.ts` | [echoAgent.md](echoAgent.md) | `test/echoAgent.test.ts` | 2 |
| `agents/dayAgent.ts` | [dayAgent.md](dayAgent.md) | `test/dayAgent.test.ts` | 2 |
| `agents/humanAgent.ts` | [humanAgent.md](humanAgent.md) | `test/humanAgent.test.ts` | 9 |
| `agents/humanCatalogAgent.ts` | [humanCatalogAgent.md](humanCatalogAgent.md) | `test/humanCatalogAgent.test.ts` | 2 |
| `agents/physicsAgent.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` | 2 |
| `agents/bankAgent.ts` | [bankAgent.md](bankAgent.md) | `test/bankAgent.test.ts` | 2 |
| `agents/houseAgent.ts` | [houseAgent.md](houseAgent.md) | `test/houseAgent.test.ts` | 4 |
| `agents/bulletinBoardAgent.ts` | [bulletinBoardAgent.md](bulletinBoardAgent.md) | `test/bulletinBoardAgent.test.ts` | 3 |
| `agents/toiletAgent.ts` | [toiletAgent.md](toiletAgent.md) | `test/toiletAgent.test.ts` | 4 |
| `agents/tickAgent.ts` | [tickAgent.md](tickAgent.md) | `test/tickAgent.test.ts` | 3 |
| `agents/human/status.ts` | [humanAgent.md](humanAgent.md) | `test/humanAgent.test.ts` |
| `agents/human/options.ts` | [humanAgent.md](humanAgent.md) | `test/humanAgent.test.ts` |
| `agents/human/time.ts` | [humanAgent.md](humanAgent.md) | `test/humanAgent.test.ts` |
| `agents/human/economy.ts` | [humanAgent.md](humanAgent.md) | `test/humanAgent.test.ts` |
| `agents/human/toilet.ts` | [humanAgent.md](humanAgent.md) | `test/humanAgent.test.ts` |
| `agents/physics/types.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` |
| `agents/physics/messages.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` |
| `agents/physics/geometry.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` |
| `agents/physics/requests.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` |
| `agents/physics/bodies.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` |
| `agents/physics/motion.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` |
| `agents/physics/handlers.ts` | [physicsAgent.md](physicsAgent.md) | `test/physicsAgent.test.ts` |
| `agents/toilet/status.ts` | [toiletAgent.md](toiletAgent.md) | `test/toiletAgent.test.ts` |
| `agents/toilet/messages.ts` | [toiletAgent.md](toiletAgent.md) | `test/toiletAgent.test.ts` |
| `agents/toilet/queue.ts` | [toiletAgent.md](toiletAgent.md) | `test/toiletAgent.test.ts` |
| `agents/toilet/occupancy.ts` | [toiletAgent.md](toiletAgent.md) | `test/toiletAgent.test.ts` |
| `agents/house/status.ts` | [houseAgent.md](houseAgent.md) | `test/houseAgent.test.ts` |
| `agents/house/messages.ts` | [houseAgent.md](houseAgent.md) | `test/houseAgent.test.ts` |
| `agents/house/purchase.ts` | [houseAgent.md](houseAgent.md) | `test/houseAgent.test.ts` |
| `agents/house/settlement.ts` | [houseAgent.md](houseAgent.md) | `test/houseAgent.test.ts` |
| `agents/bank/accounts.ts` | [bankAgent.md](bankAgent.md) | `test/bankAgent.test.ts` |
| `agents/bank/requests.ts` | [bankAgent.md](bankAgent.md) | `test/bankAgent.test.ts` |
| `agents/day/types.ts` | [dayAgent.md](dayAgent.md) | `test/dayAgent.test.ts` |
| `agents/day/options.ts` | [dayAgent.md](dayAgent.md) | `test/dayAgent.test.ts` |
| `agents/day/report.ts` | [dayAgent.md](dayAgent.md) | `test/dayAgent.test.ts` |
| `agents/tick/options.ts` | [tickAgent.md](tickAgent.md) | `test/tickAgent.test.ts` |
| `agents/bulletin/queue.ts` | [bulletinBoardAgent.md](bulletinBoardAgent.md) | `test/bulletinBoardAgent.test.ts` |
| `agents/index.ts` | [agents-index.md](agents-index.md) | `test/agents-index.test.ts` | 9 |

## Сервер и дашборд (`server/`)

| Модуль | Документация | Тест | Импортов |
|---|---|---|---|
| `server/config.ts` | [server-config.md](server-config.md) | — (тест не нужен) | 4 |
| `server/snapshot.ts` | [server-snapshot.md](server-snapshot.md) | `test/server-snapshot.test.ts` | 2 |
| `server/app.ts` | [server-app.md](server-app.md) | `test/server-app.test.ts` | 4 |
| `server/index.ts` | [server-index.md](server-index.md) | `test/server-index.test.ts` | 4 |
| `server/public/index.html` | [server-app.md](server-app.md) (раздел «Дашборд») | — (статика) | — |

## Скрипты

| Файл | Документация | Тест | Импортов |
|---|---|---|---|
| `scripts/dev.ts` | [dev.md](dev.md) | — (запускается вручную) | 3 |
| `scripts/demo.ts` | [demo.md](demo.md) | — (запускается вручную) | 2 |

## Клиент рендеринга (`client/`) — TypeScript + three.js

Собирается в `server/public/physics.js` командой `npm run build:client` (`npm start`
собирает автоматически через `prestart`). Страница — `server/public/physics.html`,
ссылка на неё есть на главном дашборде. Импорты считаются как в остальных модулях.

| Модуль | Документация | Тест | Импортов |
|---|---|---|---|
| `client/physicsView.ts` | [client-physicsView.md](client-physicsView.md) | `test/physicsView.test.ts` | 1 |
| `client/physicsApi.ts` | [client-physicsApi.md](client-physicsApi.md) | `test/physicsApi.test.ts` | 1 |
| `client/physicsMotion.ts` | [client-physicsMotion.md](client-physicsMotion.md) | `test/physicsMotion.test.ts` | 0 |
| `client/physicsScene.ts` | [client-physicsScene.md](client-physicsScene.md) | `test/physicsScene.test.ts` | 4 |
| `client/physicsMain.ts` | [client-physicsMain.md](client-physicsMain.md) | `test/physicsMain.test.ts` | 3 |

Правило «не больше четырёх импортов на модуль» соблюдено почти везде — предел виден
в последнем столбце. Два отступления: `agents/humanAgent.ts` (9) — оркестратор дел и
походов человека, и `agents/index.ts` (9) — список всех агентов; оба можно разбить на
подмодули, если понадобится. Направление зависимостей — `agents/ → lib/`: в `lib/` нет
агентов моделей. Исключение одно — служебный `lib/rosterAgent.ts`: он часть ядра и
поднимается `World` автоматически.
