# `lib/index.ts` — публичный API

Единая точка входа: то, что видят снаружи.

```js
import { World, ECHO_AGENT_TYPE } from './lib/index.ts';

const world = new World({ [ECHO_AGENT_TYPE]: 4 });
await world.run();
await world.stop();
```

## Что реэкспортируется

| Из модуля | Что |
|---|---|
| `world.ts` | `World`, `WorldOptions` |
| `registry.ts` | `AgentRegistry`, `createDefaultRegistry` |
| `agents/echoAgent.ts` | `ECHO_AGENT_TYPE`, `EchoAgent`, `EchoAgentOptions` |
| `protocol.ts` | `createMessage`, `isMessage`, типы `ActorId`, `ActorAssignment`, `Message` |

Типы самих акторов (`Actor`, `ActorContext`, `AbstractActor`) остаются в
`lib/actor.ts`: модуль держим в пределе четырёх импортов, а нужны эти типы только
тем, кто пишет своего агента.

## Зачем отдельный файл

- **Один вход.** Пользователю мира не нужно знать, из каких файлов он собран.
- **Проверка на здоровье.** Тест `test/index.test.ts` падает, если кто-то случайно
  убрал экспорт: это дешёвая защита от «сломалось, но тесты зелёные».

## Тест

`test/index.test.ts` — все экспорты на месте, `createMessage`/`isMessage` работают,
мир из одного агента запускается и останавливается через публичный API.
