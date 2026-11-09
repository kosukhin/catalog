# `client/physicsMain.ts` — страница физики

Точка входа браузерного бандла. `startPhysicsView()` находит `canvas`, панель и
статус, поднимает сцену (`createScene`) и раз в ~0.7 с перезапрашивает `/api/physics`,
обновляя тела и панель.

Модуль сам запускается по `DOMContentLoaded`, но при импорте в Node ничего не делает
(`document` отсутствует) — поэтому его можно безопасно импортировать в тестах.

Собирается в `server/public/physics.js` командой `npm run build:client`
(esbuild; `npm start` собирает его автоматически через `prestart`).

## Что экспортирует

| Экспорт | Назначение |
|---|---|
| `startPhysicsView()` | поднимает страницу: сцена + периодический опрос `/api/physics` |

## Тест

`test/physicsMain.test.ts` — модуль импортируется в Node и экспортирует
`startPhysicsView`.
