# `lib/index.ts` — публичный API ядра

Единая точка входа в ядро мира.

```js
import { World } from './lib/index.ts';
import * as myAgent from './путь/к/агенту.ts';

const world = new World({ [myAgent.type]: 4 }, { agents: [myAgent] });
await world.run();
await world.stop();
```

## Что реэкспортируется

| Из модуля | Что |
|---|---|
| `world.ts` | `World`, `WorldOptions` |
| `protocol.ts` | `createMessage`, `isMessage`, типы `ActorId`, `ActorAssignment`, `Message` |
| `agentPlugin.ts` | тип `AgentPlugin` |

## Чего здесь нет и почему

- **Агентов нет.** Ядро не знает ни одного конкретного агента: модуль агента
  подключает приложение и передаёт его в `options.agents`.
- **Реестра нет.** Он был бы знанием ядра о конкретных типах. Вместо него — контракт
  модуля (`type` + `moduleUrl` + `createAgent`) и загрузка по адресу в потоке.
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
