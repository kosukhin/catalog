# `lib/index.ts` — публичный API

Единая точка входа: то, что видят снаружи.

```js
import { World } from './lib/index.ts';
import { ECHO_AGENT_TYPE } from '../agents/echoAgent.ts';

const world = new World({ [ECHO_AGENT_TYPE]: 4 });
await world.run();
await world.stop();
```

## Что реэкспортируется

| Из модуля | Что |
|---|---|
| `world.ts` | `World`, `WorldOptions` |
| `registry.ts` | `AgentRegistry`, `createDefaultRegistry` |
| `protocol.ts` | `createMessage`, `isMessage`, типы `ActorId`, `ActorAssignment`, `Message` |

Границы модуля заданы требованием «директория с агентами живёт отдельно от кода
`lib`», поэтому:

- **агенты не реэкспортируются** — `EchoAgent` и `ECHO_AGENT_TYPE` подключаются
  из `agents/echoAgent.ts` напрямую;
- **реестр агентов при этом остаётся в `lib`** (`registry.ts`), потому что мир
  создаёт агентов по строковому типу, а не по ссылке на класс;
- **типы акторов** (`Actor`, `ActorContext`, `AbstractActor`) лежат в
  `lib/actor.ts`: нужны только тем, кто пишет своего агента.


## Зачем отдельный файл

- **Один вход в ядро.** Пользователю мира не нужно знать, из каких файлов он собран.
- **Проверка контракта.** Тест `test/index.test.ts` падает и если из API пропал
  нужный экспорт, и если в `lib` случайно просочился агент из `agents/`: граница
  «ядро / агенты» держится тестом, а не договорённостью.

## Тест

`test/index.test.ts` — `World`/`createDefaultRegistry`/`createMessage`/`isMessage`
на месте, `EchoAgent` и `ECHO_AGENT_TYPE` из публичного API отсутствуют, реестр
знает агента из `agents/`, мир из одного агента запускается и останавливается.

