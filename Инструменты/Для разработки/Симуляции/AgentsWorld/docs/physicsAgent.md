# `agents/physicsAgent.ts` — физика мира

Единственный владелец физического состояния тел: где и на какой высоте находится
каждый агент. Сами агенты координат не хранят — они только просят `PhysicsAgent`
переместиться.

Мир трёхмерный: точка — это `{ x, y, z }`, где `z` — высота.

## Что экспортирует

| Экспорт | Назначение |
|---|---|
| `type` | `'PhysicsAgent'` |
| `moduleUrl`, `createAgent` | контракт модуля агента |
| `PhysicsAgent` | класс |
| `PHYSICS_AGENT_ID` | `'PhysicsAgent-1'` |
| `PHYSICS_REGISTER`, `PHYSICS_MOVE`, `PHYSICS_MOVE_TO`, `PHYSICS_REPORT`, `PHYSICS_ARRIVED`, `PHYSICS_POSITION`, `PHYSICS_BODY`, `PHYSICS_LIST`, `PHYSICS_STATE` | типы сообщений |
| `Point`, `PhysicsBody`, `Bounds`, `MoveReport`, `ArrivalReport`, `PhysicsState`, `PhysicsAgentOptions` | типы данных |

## Настройки

| Настройка | По умолчанию | Зачем |
|---|---|---|
| `speed` | 5 | скорость перемещения, единиц в секунду |
| `stepSeconds` | 1 | сколько секунд мира проходит за один `tick` |
| `minDistance` | 1 | минимальная дистанция между телами (коллизия) |
| `spawnDistance` | = `minDistance` | шаг поиска свободной точки при регистрации без позиции (разнос тел) |
| `arriveDistance` | 1 | на каком расстоянии от цели считать, что дошёл |
| `bounds` | `0…100` по x/y/z | границы мира |

За один `tick` тело проходит `speed · stepSeconds`.

## Сообщения

| Сообщение | Полезная нагрузка | Что делает `PhysicsAgent` |
|---|---|---|
| `physics-register` | `{ id, position? }` | заводит тело; без точки — сам находит свободное место |
| `physics-move` | `{ id, direction: {x,y,z}, distance, replyTo }` | сдвиг по направлению на дистанцию |
| `physics-move-to` | `{ id, targetId, replyTo }` | идёт к другому телу (направление пересчитывается каждый шаг) |
| `physics-report` | `MoveReport` | ответ: `accepted`, `reason`, текущая точка |
| `physics-arrived` | `ArrivalReport` | тело дошло (или остановилось с причиной) |
| `physics-position` | `{ id, replyTo }` | вопрос о позиции |
| `physics-body` | `{ id, body }` | ответ: для кого спрашивали и тело или `null` |
| `physics-list` | `{ replyTo }` | запрос всего состояния физики |
| `physics-state` | `PhysicsState` | ответ: `speed`, `stepSeconds`, `minDistance`, `arriveDistance`, `bounds`, `bodies`, `moving` |

`tick` (из `lib/protocol.ts`) запускает шаг физики: кто-то должен будить
`PhysicsAgent` — например, `TickAgent` с типом `PhysicsAgent` в настройках.

## Как происходит перемещение

1. Приходит запрос (`physics-move` или `physics-move-to`).
2. `PhysicsAgent` проверяет **прямой путь**: разбивает его на шаги по `minDistance` и
   смотрит, не выходит ли точка за `bounds` и не задевает ли другое тело (своё тело
   и цель преследования помехой не считаются).
3. Если можно — тело ставится в очередь движения и отвечает `physics-report`
   `accepted: true`; иначе — `accepted: false` с причиной.
4. На каждом `tick` тело сдвигается на `speed · stepSeconds` к цели (для `move-to`
   цель — текущая позиция другого тела).
5. По достижении цели (или если путь заблокировали) приходит `physics-arrived`.

## Инварианты

- Тело без позиции получает свободную точку в границах (детерминированный поиск).
- Точка вне границ при регистрации игнорируется (тело не заводится).
- Незарегистрированное тело или цель — отказ с понятной причиной, без падения.
- Запрос без `replyTo` отчитывается только строкой в лог.
- На незнакомое сообщение — строка в лог.
- `describe()` отдаёт число тел, число движений и скорость — агент виден в дашборде.

## Пример

```ts
context.send(PHYSICS_AGENT_ID, createMessage(PHYSICS_REGISTER, { id: context.id }));
context.send(PHYSICS_AGENT_ID, createMessage(PHYSICS_MOVE_TO, { id: context.id, targetId: 'HumanAgent-2', replyTo: context.id }));
```

Результат движения приходит сообщениями `physics-report` и `physics-arrived`.

## Тест

`test/physicsAgent.test.ts` — контракт модуля, регистрация с точкой и без, границы,
движение по направлению и дистанции, отказ за границы и на наложение, путь к другому
телу, отказы на незарегистрированное тело/цель и нулевое направление, вопрос о
позиции, полное состояние физики, состояние для дашборда, незнакомое сообщение,
проверка настроек.
