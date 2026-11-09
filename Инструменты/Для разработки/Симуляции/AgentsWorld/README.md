# AgentsWorld

Идея здесь в том, чтобы создать набор агентов, наполнив мир агентами, каждый агент или актор может иметь свое поведение , мир содержит какое-то количество акторов, акторы работают параллельно использую пул потоков.

Система должна позволять эмулировать реальный параллельный мир, в котором акторы смогут выполнять действия по заложенному в них сценарию.

## Как это устроено

- **`World`** принимает один аргумент — состав мира: `Map`, где ключ это модуль
  агента, а значение — сколько таких агентов нужно (`new Map([[echoAgent, 6]])`).
  Метод `run()` запускает мир, `stop()` останавливает.
- **Ядро не знает агентов моделей.** В `lib/` нет ни одного агента-модели; ядру от
  модуля агента нужны только `type`, `moduleUrl` и `createAgent` — контракт
  `AgentPlugin`. Единственный «агент» в ядре — служебный реестр `lib/rosterAgent.ts`:
  `World` поднимает его всегда, чтобы агенты могли находить друг друга по типу.
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
npm install        # express и типы (нужны один раз)
npm start          # сервер + дашборд: http://localhost:3000
npm run demo       # демонстрация мира в консоли
npm test           # модульные тесты (node --test)
npm run typecheck  # проверка типов
```

```js
import * as echoAgent from '../agents/echoAgent.ts';
import { World } from './lib/index.ts';

const world = new World(new Map([[echoAgent, 4]]));
// настройки для типа: { count, options }
const configured = new World(new Map([[dayAgent, { count: 1, options: { timeScale: 60 } }]]));
console.log(`агентов: ${world.actors.length}, потоков: ${world.threadCount}`);
await world.run();
await world.stop();
```

## Структура

```
server/               express-приложение: API и дашборд
├── config.ts         состав мира и настройки из окружения
├── snapshot.ts       опрос агентов: кто жив и в каком состоянии
├── app.ts            маршруты /api/world, /api/agents и статика
├── index.ts          запуск мира и сервера
└── public/index.html дашборд: поиск, пагинация, состояния
lib/                  ядро мира (+ служебный реестр) — агентов моделей не знает
├── protocol.ts       типы сообщений и команд потоков
├── mailbox.ts        почтовый ящик актора
├── actor.ts          контракт актора и AbstractActor
├── actorRuntime.ts   почтовый цикл актора
├── stats.ts          состав мира (Map «модуль → количество») → задания
├── agentPlugin.ts    контракт модуля агента (type, moduleUrl, createAgent)
├── agentLoader.ts    загрузка кода агента по адресу внутри потока
├── threadPool.ts     пул потоков worker_threads
├── workerEntry.ts    код, исполняемый внутри потока
├── world.ts          мир: запуск, распределение, маршрутизация сообщений
├── rosterAgent.ts    служебный реестр агентов (поднимает World всегда)
└── index.ts          публичный API ядра
agents/               агенты — подключаются снаружи
├── dayAgent.ts       время в мире: число, день недели, день/ночь (единственный)
├── humanCatalogAgent.ts  каталог людей с поиском по свойствам (единственный)
├── humanAgent.ts     человек: ищет банк, покупает дом, ходит в туалет
├── physicsAgent.ts   физика мира: точки и высоты тел, перемещение по запросу
├── bankAgent.ts      банк: счёт с депозитом 1000 и списания
├── houseAgent.ts     дома: продаёт дом за 800 в точке человека
├── bulletinBoardAgent.ts  доска объявлений: ищет агентов по типу через реестр
├── toiletAgent.ts    туалет: одно место, очередь, 20 игровых минут
├── tickAgent.ts      будильник мира: шлёт импульсы tick агентам нужных типов
├── index.ts          все агенты мира одним списком
└── echoAgent.ts      простейший печатающий агент (для проверки рантайма)
scripts/demo.ts       демонстрация запуска (точка сборки мира)
docs/                 документация: один файл на модуль
docs/models/          описания моделей агентов (что реализуем)
test/                 модульные тесты: один файл на модуль
.clinerules/          требования к разработке в этой папке
```

Зависимости идут только в одну сторону: `agents/` → `lib/`. Обратных импортов нет,
поэтому новый агент не требует правок в ядре. Исключение одно — служебный
`lib/rosterAgent.ts`: это часть ядра, `World` поднимает его всегда.

Подробности по каждому модулю — в [docs/README.md](docs/README.md).

## Дашборд

`npm start` поднимает мир и http://localhost:3000. Дашборд показывает, сколько
агентов работает, сколько потоков занято, виртуальное время мира и состояние
каждого агента. Если агентов много — есть поиск (по id, типу и состоянию) и
пагинация.

| Маршрут | Что отдаёт |
|---|---|
| `GET /api/world` | работает ли мир, потоки, состав по типам, виртуальное время |
| `GET /api/agents?page=&pageSize=&search=` | страница агентов с состояниями |

Настройки через окружение: `PORT` (по умолчанию 3000), `HUMANS` (12),
`PAGE_SIZE` (20), `TIME_SCALE` (800 — во сколько раз время мира быстрее реального),
`TICK_MS` (1000 — как часто тикер будит людей).

```bash
PORT=8080 HUMANS=50 TIME_SCALE=60 TICK_MS=500 npm start
```

## Мир из моделей

Демо собирает мир, описанный в [docs/models/](docs/models/): время, каталог людей и
сами люди.

| Агент | Роль | Документация |
|---|---|---|
| `DayAgent` | единственный источник времени; идёт в 10× быстрее реального (`timeScale`) | [dayAgent.md](docs/dayAgent.md) |
| `HumanCatalogAgent` | единственный каталог: поиск людей по имени, полу, профессии | [humanCatalogAgent.md](docs/humanCatalogAgent.md) |
| `HumanAgent` | человек: днём находит банк, открывает счёт, покупает дом, ходит в туалет | [humanAgent.md](docs/humanAgent.md) |
| `PhysicsAgent` | физика мира: хранит точки и высоты тел, перемещает тела по запросу | [physicsAgent.md](docs/physicsAgent.md) |
| `BankAgent` | банк: счёт с депозитом 1000, списание за дом | [bankAgent.md](docs/bankAgent.md) |
| `HouseAgent` | дома: продаёт дом за 800 и ставит его в точке человека | [houseAgent.md](docs/houseAgent.md) |
| `BulletinBoardAgent` | доска объявлений: находит агентов нужного типа через реестр | [bulletinBoardAgent.md](docs/bulletinBoardAgent.md) |
| `ToiletAgent` | туалет: одно место, очередь, 20 игровых минут внутри | [toiletAgent.md](docs/toiletAgent.md) |
| `TickAgent` | будильник мира: шлёт `tick` агентам нужных типов (адреса берёт у реестра) | [tickAgent.md](docs/tickAgent.md) |
| `RosterAgent` (служебный) | реестр агентов мира: поиск по типу и подписка на новых; поднимает `World` | [rosterAgent.md](docs/rosterAgent.md) |

Связи между ними — только сообщениями: человек спрашивает время у `DayAgent`,
регистрируется в каталоге и ищет других людей через него, а `TickAgent` шлёт ему
импульс — по импульсу человек пересчитывает своё состояние.


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

const world = new World(new Map([[echoAgent, 6], [myAgent, 3]]));
```

`lib` при этом не меняется: он не знает, какие агенты существуют, — ему их сообщают.

