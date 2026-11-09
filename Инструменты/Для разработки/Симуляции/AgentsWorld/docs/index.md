# `lib/index.ts` — публичный API ядра

Единая точка входа в ядро мира.

```js
import { World } from './lib/index.ts';
import * as myAgent from './путь/к/агенту.ts';

const world = new World(new Map([[myAgent, 4]]));
await world.run();
await world.stop();
```

## Что реэкспортируется

| Из модуля | Что |
|---|---|
| `world.ts` | `World`, `WorldOptions` |
| `protocol.ts` | `createMessage`, `isMessage`, `WORLD_ID`, типы `ActorId`, `ActorAssignment`, `Message` |
| `agentPlugin.ts` | тип `AgentPlugin` |
| `stats.ts` | тип `Population` — состав мира: `Map` «модуль → количество» |

## Чего здесь нет и почему

- **Агентов нет.** Ядро не знает ни одного конкретного агента: модуль агента
  подключает приложение и передаёт его ключом в `Map` состава мира.
- **Реестра агентов мира здесь нет.** Публичный API не знает конкретных типов: модуль
  агента подключается контрактом (`type` + `moduleUrl` + `createAgent`). Служебный
  реестр (`lib/rosterAgent.ts`) `World` поднимает сам — он не входит в публичный API.
- **Типов акторов нет.** `Actor`, `ActorContext`, `AbstractActor` лежат в
  `lib/actor.ts`: нужны только тем, кто пишет своего агента.

## Зачем отдельный файл

- **Один вход в ядро.** Пользователю мира не нужно знать, из каких файлов он собран.
- **Проверка границы.** Тест `test/index.test.ts` падает и если из API пропал нужный
  экспорт, и если в публичное API ядра просочился агент или реестр.

## Тест

`test/index.test.ts` — `World`/`createMessage`/`isMessage` на месте, `EchoAgent`,
`AgentRegistry` и `createDefaultRegistry` в публичном API отсутствуют, модуль агента
сам сообщает тип и адрес, мир из одного агента запускается и останавливается.
