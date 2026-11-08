# Документация AgentsWorld

Один модуль — один файл документации. Файлы названы так же, как модули в `lib/`.
Тесты лежат в `test/` и названы `<модуль>.test.ts`.

| Модуль | Документация | Тест | Импортов |
|---|---|---|---|
| `lib/protocol.ts` | [protocol.md](protocol.md) | `test/protocol.test.ts` | 0 |
| `lib/mailbox.ts` | [mailbox.md](mailbox.md) | `test/mailbox.test.ts` | 1 |
| `lib/actor.ts` | [actor.md](actor.md) | `test/actor.test.ts` | 1 |
| `lib/actorRuntime.ts` | [actorRuntime.md](actorRuntime.md) | `test/actorRuntime.test.ts` | 3 |
| `lib/stats.ts` | [stats.md](stats.md) | `test/stats.test.ts` | 1 |
| `lib/registry.ts` | [registry.md](registry.md) | `test/registry.test.ts` | 2 |
| `agents/echoAgent.ts` | [echoAgent.md](echoAgent.md) | `test/echoAgent.test.ts` | 2 |
| `lib/threadPool.ts` | [threadPool.md](threadPool.md) | `test/threadPool.test.ts` | 3 |
| `lib/workerEntry.ts` | [workerEntry.md](workerEntry.md) | `test/workerEntry.test.ts` | 4 |
| `lib/world.ts` | [world.md](world.md) | `test/world.test.ts` | 4 |
| `lib/index.ts` | [index.md](index.md) | `test/index.test.ts` | 4 |
| `scripts/demo.ts` | [demo.md](demo.md) | — (запускается вручную) | 1 |

Правило «не больше четырёх импортов на модуль» соблюдено во всех файлах: предел
виден в последнем столбце, поэтому разбиение на подмодули пока не требуется.
