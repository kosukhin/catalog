# `client/physicsApi.ts` — загрузка состояния физики и имён

Тянет данные с сервера: `loadPhysicsState(url, fetcher)` запрашивает `/api/physics` и
возвращает `PhysicsState`; `loadAgentNames(url, fetcher)` запрашивает
`/api/agents?pageSize=200` и возвращает отображение «адрес агента → имя»;
`loadWorldClock(url, fetcher)` запрашивает `/api/clock` и возвращает `TimeReport` или
`null`, если часы мира не ответили. `fetcher` подменяется в тестах (по умолчанию —
глобальный `fetch`, который бросает исключение на не-2xx).

Имена нужны сцене для подписей: у `HumanAgent` в `details` есть `name`, поэтому сцена
подписывает сферу именем человека, а не адресом вида `HumanAgent-7`.

`toNames(payload)` — чистая функция разбора ответа `/api/agents`. Она не падает на
неожиданном ответе: если `items` нет, это не массив или у записи не строковое `name`,
запись просто пропускается (возвращается пустое отображение). Так сцена показывает
адрес вместо имени, а не ломается.

`toClock(payload)` — разбор ответа `/api/clock` (`{ clock: TimeReport | null }`).
Ответ без `hours`/`minutes` числами считается отсутствием часов (`null`), чтобы
страница показала прочерк, а не `NaN` в статусной строке.

Типы `PhysicsState` и `TimeReport` берутся из `agents/physicsAgent.ts` и
`agents/dayAgent.ts` только как типы — в бандл не попадают.

## Что экспортирует

| Экспорт | Назначение |
|---|---|
| `loadPhysicsState(url, fetcher?)` | загружает и разворачивает состояние физики |
| `loadAgentNames(url, fetcher?)` | загружает имена агентов по их адресам |
| `toNames(payload)` | разбирает ответ `/api/agents` в отображение «адрес → имя» |
| `loadWorldClock(url, fetcher?)` | загружает виртуальное время мира (`/api/clock`) |
| `toClock(payload)` | разбирает ответ `/api/clock`, чужие ответы дают `null` |
| `AgentNames`, `PhysicsFetcher` | типы отображения имён и функции загрузки |

## Тест

`test/physicsApi.test.ts` — загрузка по адресу через подставной `fetcher`, проброс
ошибки загрузки, сборка имён по адресам, пропуск агентов без имени и устойчивость к
чужому ответу, загрузка имён с отдельного адреса, загрузка времени мира, `null` при
молчании часов и устойчивость `toClock` к чужому ответу.

## Разложение на подмодули

| Подмодуль | Что содержит |
|---|---|
| `client/physics/fetcher.ts` | тип `PhysicsFetcher` и `defaultFetcher` (проверка `response.ok`) |
| `client/physics/names.ts` | `loadAgentNames` и `toNames` (разбор `/api/agents`) |

`client/physicsApi.ts` оставляет три функции: `loadPhysicsState`, `loadWorldClock`,
`toClock`, и ре-экспортирует тип `PhysicsFetcher`.
