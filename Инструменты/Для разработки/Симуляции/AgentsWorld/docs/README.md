# Документация AgentsWorld

Один модуль — один файл документации. Файлы названы так же, как модули.
Тесты лежат в `test/` и названы `<модуль>.test.ts`.

## Ядро (`lib/`) — ничего не знает об агентах

| Модуль | Документация | Тест | Импортов |
|---|---|---|---|
| `lib/protocol.ts` | [protocol.md](protocol.md) | `test/protocol.test.ts` | 0 |
| `lib/mailbox.ts` | [mailbox.md](mailbox.md) | `test/mailbox.test.ts` | 1 |
| `lib/actor.ts` | [actor.md](actor.md) | `test/actor.test.ts` | 1 |
| `lib/actorRuntime.ts` | [actorRuntime.md](actorRuntime.md) | `test/actorRuntime.test.ts` | 3 |
| `lib/stats.ts` | [stats.md](stats.md) | `test/stats.test.ts` | 2 |
| `lib/agentPlugin.ts` | [agentPlugin.md](agentPlugin.md) | `test/agentPlugin.test.ts` | 1 |
| `lib/agentLoader.ts` | [agentLoader.md](agentLoader.md) | `test/agentLoader.test.ts` | 1 |
| `lib/threadPool.ts` | [threadPool.md](threadPool.md) | `test/threadPool.test.ts` | 3 |
| `lib/workerEntry.ts` | [workerEntry.md](workerEntry.md) | `test/workerEntry.test.ts` | 4 |
| `lib/world.ts` | [world.md](world.md) | `test/world.test.ts` | 3 |
| `lib/index.ts` | [index.md](index.md) | `test/index.test.ts` | 4 |

## Агенты (`agents/`) — подключаются снаружи

Модели описаны в [models/](models/), реализация — в `agents/`.

| Модуль | Документация | Тест | Импортов |
|---|---|---|---|
| `agents/echoAgent.ts` | [echoAgent.md](echoAgent.md) | `test/echoAgent.test.ts` | 2 |
| `agents/dayAgent.ts` | [dayAgent.md](dayAgent.md) | `test/dayAgent.test.ts` | 2 |
| `agents/humanAgent.ts` | [humanAgent.md](humanAgent.md) | `test/humanAgent.test.ts` | 4 |
| `agents/humanCatalogAgent.ts` | [humanCatalogAgent.md](humanCatalogAgent.md) | `test/humanCatalogAgent.test.ts` | 2 |
| `agents/tickAgent.ts` | [tickAgent.md](tickAgent.md) | `test/tickAgent.test.ts` | 2 |
| `agents/index.ts` | [agents-index.md](agents-index.md) | `test/agents-index.test.ts` | 4 |

## Сервер и дашборд (`server/`)

| Модуль | Документация | Тест | Импортов |
|---|---|---|---|
| `server/config.ts` | [server-config.md](server-config.md) | `test/server-config.test.ts` | 4 |
| `server/snapshot.ts` | [server-snapshot.md](server-snapshot.md) | `test/server-snapshot.test.ts` | 2 |
| `server/app.ts` | [server-app.md](server-app.md) | `test/server-app.test.ts` | 4 |
| `server/index.ts` | [server-index.md](server-index.md) | `test/server-index.test.ts` | 4 |
| `server/public/index.html` | [server-app.md](server-app.md) (раздел «Дашборд») | — (статика) | — |

## Скрипты

| Файл | Документация | Тест | Импортов |
|---|---|---|---|
| `scripts/demo.ts` | [demo.md](demo.md) | — (запускается вручную) | 2 |

Правило «не больше четырёх импортов на модуль» соблюдено во всех файлах: предел
виден в последнем столбце. Направление зависимостей — только `agents/ → lib/`:
в `lib/` нет ни одного упоминания агентов.
