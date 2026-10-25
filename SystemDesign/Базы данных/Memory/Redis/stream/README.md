# Redis Streams

Рабочий пример использования **Redis Streams** — лога сообщений с consumer groups.

- [Приложение](./app/) — Node.js + Express + Redis Streams в Docker
- Тесты — [app/test/streams.test.js](./app/test/streams.test.js)

## Что такое Streams

Stream (`XADD/XREAD/XREADGROUP`) — это append-only лог: сообщения добавляются в конец,
потребители читают их с сохранением порядка, с подтверждением обработки и повторной доставкой.

```
XADD events * user "alice" action "login"
XGROUP CREATE events workers 0
XREADGROUP GROUP workers c1 COUNT 10 BLOCK 5000 STREAMS events ">"
XACK events workers 1719000000000-1
```

Ключевые возможности по сравнению с Pub/Sub:

| | Pub/Sub | Streams |
|---|---|---|
| Доставка | fire-and-forget, только онлайн-подписчикам | persistent, новые потребители читают историю |
| Гарантии | нет подтверждений | XACK + XAUTOCLAIM (re-delivery) |
| Группы | нет | consumer groups, нагрузка делится между воркерами |
| Хранение | нет | до MAXLEN/XTRIM |

## Consumer Group — как работает

- Каждое сообщение имеет ID `timestamp-seq` (например `1719000000000-1`).
- Группа хранит `last-delivered-id` — новое сообщение доставляется каждому воркеру ровно один раз (round-robin).
- Неподтверждённые (XACK не пришёл) сообщения попадают в **PEL** (pending entries list) — их можно забрать
  другим воркером через `XAUTOCLAIM` (нужен минимум idle-time). Это и есть «at-least-once» доставка.

В примере: воркер обрабатывает сообщение и **крэшится** на сообщении `"crash"`,
затем второй воркер через `XAUTOCLAIM` подхватывает его из PEL.

## Как запустить

```bash
cd app
docker compose up -d --build

# отправить событие
curl -X POST http://localhost:3001/events -H 'Content-Type: application/json' \
  -d '{"user":"alice","action":"login"}'

# посмотреть статистику: сколько в стриме, сколько pending, обработано
curl http://localhost:3001/stats

# дашборд
open http://localhost:3001/
```

## Архитектура примера

- `POST /events` — producer: `XADD` в stream `events` с `MAXLEN ~ 1000` (не даём стриму расти бесконечно).
- Фоновый воркер (`XREADGROUP BLOCK 5000`) в consumer group `workers`: инкрементирует счётчик обработанных,
  `XACK`. Сообщение `action:"crash"` — имитация падения обработчика (не ACK).
- `GET /stats` — `XLEN`, `XINFO STREAM`, `XPENDING` → JSON.
- `GET /` — HTML-дашборд с живой статистикой.
