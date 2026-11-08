# AgentsWorld

Идея здесь в том, чтобы создать набор агентов, наполнив мир агентами, каждый агент или актор может иметь свое поведение , мир содержит какое-то количество акторов, акторы работают параллельно использую пул потоков.

Система должна позволять эмулировать реальный параллельный мир, в котором акторы смогут выполнять действия по заложенному в них сценарию.

## Как это устроено

- **`World`** принимает статистику агентов (`{ 'МойАгент': 4 }`) и список модулей
  агентов (`{ agents: [myAgent] }`), а методом `run()` запускает мир. `stop()`
  останавливает.
- **Ядро не знает агентов.** В `lib/` нет ни одного упоминания конкретного агента и
  нет реестра. Ядру от модуля агента нужны только `type`, `moduleUrl` и
  `createAgent` — контракт `AgentPlugin`.
- **Параллелизм настоящий:** каждый поток — отдельный `worker_threads`-воркер, то
  есть отдельный поток ОС. Агенты распределяются по потокам по кругу. Код агента
  поток грузит сам по `moduleUrl` (`import(moduleUrl)`).
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
import * as echoAgent from '../agents/echoAgent.ts';
import { World } from './lib/index.ts';

const world = new World({ [echoAgent.type]: 4 }, { agents: [echoAgent] });
console.log(`агентов: ${world.actors.length}, потоков: ${world.threadCount}`);
await world.run();
await world.stop();
```

## Структура

```
lib/                  ядро мира — про агентов не знает ничего
├── protocol.ts       типы сообщений и команд потоков
├── mailbox.ts        почтовый ящик актора
├── actor.ts          контракт актора и AbstractActor
├── actorRuntime.ts   почтовый цикл актора
├── stats.ts          статистика мира → заготовки акторов
├── agentPlugin.ts    контракт модуля агента (type, moduleUrl, createAgent)
├── agentLoader.ts    загрузка кода агента по адресу внутри потока
├── threadPool.ts     пул потоков worker_threads
├── workerEntry.ts    код, исполняемый внутри потока
├── world.ts          мир: запуск, распределение, маршрутизация сообщений
└── index.ts          публичный API ядра
agents/               агенты — подключаются снаружи
└── echoAgent.ts      простейший печатающий агент
scripts/demo.ts       демонстрация запуска (точка сборки мира)
docs/                 документация: один файл на модуль
test/                 модульные тесты: один файл на модуль
.clinerules/          требования к разработке в этой папке
```

Зависимости идут только в одну сторону: `agents/` → `lib/`. Обратных импортов нет,
поэтому новый агент не требует правок в ядре.

Подробности по каждому модулю — в [docs/README.md](docs/README.md).

## Свой агент

Модуль агента обязан экспортировать три вещи:

```ts
// agents/myAgent.ts
import { AbstractActor } from '../lib/actor.ts';

export const type = 'MyAgent';                  // имя для статистики мира
export const moduleUrl = import.meta.url;       // адрес, по которому поток загрузит код

export class MyAgent extends AbstractActor {
    readonly type = type;

    protected handle(message, context) {
        context.log(`получил ${message.type}`);
    }
}

export function createAgent(id, options) {      // как создать экземпляр
    return new MyAgent(options);
}
```

Подключить — там, где собирается мир (в демо или в приложении):

```js
import * as myAgent from '../agents/myAgent.ts';

const world = new World({ [myAgent.type]: 3 }, { agents: [echoAgent, myAgent] });
```

`lib` при этом не меняется: он не знает, какие агенты существуют, — ему их сообщают.

