# AgentsWorld

Идея здесь в том, чтобы создать набор агентов, наполнив мир агентами, каждый агент или актор может иметь свое поведение , мир содержит какое-то количество акторов, акторы работают параллельно использую пул потоков.

Система должна позволять эмулировать реальный параллельный мир, в котором акторы смогут выполнять действия по заложенному в них сценарию.

## Как это устроено

- **`World`** принимает статистику агентов (`{ EchoAgent: 4 }`) и методом `run()`
  запускает мир. `stop()` останавливает.
- **Параллелизм настоящий:** каждый поток — отдельный `worker_threads`-воркер, то
  есть отдельный поток ОС. Агенты распределяются по потокам по кругу.
- **ActorModel:** акторы не общаются напрямую — только сообщения через почтовые
  ящики (`Mailbox`). Сообщение между потоками проводит мир.
- **`EchoAgent`** — простейший агент для проверки: печатает приветствие и эхо
  собственных сообщений.

## Быстрый старт

Требуется Node.js 22.18+ (TypeScript исполняется напрямую, сборка не нужна).

```bash
npm start          # демонстрация: 6 агентов на пуле потоков
npm test           # модульные тесты (node --test)
npm run typecheck  # проверка типов (нужны typescript и @types/node)
```

```js
import { World } from './lib/index.ts';
import { ECHO_AGENT_TYPE } from '../agents/echoAgent.ts';

const world = new World({ [ECHO_AGENT_TYPE]: 4 });
console.log(`агентов: ${world.actors.length}, потоков: ${world.threadCount}`);
await world.run();
await world.stop();
```

## Структура

```
lib/
├── protocol.ts       типы сообщений и команд потоков
├── mailbox.ts        почтовый ящик актора
├── actor.ts          контракт актора и AbstractActor
├── actorRuntime.ts   почтовый цикл актора
├── stats.ts          статистика мира → наряды на создание агентов
├── registry.ts       реестр «тип агента → фабрика»
├── threadPool.ts     пул потоков worker_threads
├── workerEntry.ts    код, исполняемый внутри потока
├── world.ts          мир: запуск, распределение, маршрутизация сообщений
└── index.ts          публичный API
agents/
└── echoAgent.ts      простейший печатающий агент
scripts/demo.ts       демонстрация запуска
docs/                 документация: один файл на модуль
test/                 модульные тесты: один файл на модуль
.clinerules/          требования к разработке в этой папке
```

Подробности по каждому модулю — в [docs/README.md](docs/README.md).

## Свой агент

```js
// agents/myAgent.ts
import { AbstractActor } from '../lib/actor.ts';

export class MyAgent extends AbstractActor {
    readonly type = 'MyAgent';

    protected handle(message, context) {
        context.log(`получил ${message.type}`);
        context.send('EchoAgent-1', { type: 'echo', payload: { text: 'привет' } });
    }
}
```

Затем зарегистрировать его в `createDefaultRegistry()` (`lib/registry.ts`) — после
этого тип станет доступен и миру, и воркерам.
