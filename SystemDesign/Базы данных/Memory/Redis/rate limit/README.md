# Rate Limiting с Redis

Каталог с теорией и рабочим примером использования **Redis в качестве rate limiter**.

- [Теория (README)](./README.md) — этот файл
- [Рабочее приложение](./app/) — Node.js + Express + Redis в Docker
- Тест — [app/test/rateLimiter.test.js](./app/test/rateLimiter.test.js)

---

## Зачем Redis для rate limiting

Rate limiter должен быть **быстрым, атомарным и общим** между инстансами приложения.
In-memory лимитер (Map в памяти Node) не работает за несколькими репликами — у каждой свой счётчик.
Redis решает это: единое хранилище счётчиков, операции за ~1ms, атомарные команды и Lua-скрипты.

## Алгоритмы

### 1. Fixed Window Counter (фиксированное окно)

> __Что такое окно?__ Окно — это фиксированный отрезок времени, внутри которого считается лимит
> (например, окно = 60 сек, лимит = 100 запросов). Время делится на целые отрезки: окно №N занимает
> интервал `[N*60, (N+1)*60)` секунд, а его номер — это `floor(now / windowSize)`.
> Каждому окну соответствует свой ключ в Redis (`rate:{userId}:{номер_окна}`), поэтому при смене окна
> счётчик «сбрасывается сам» — просто начинает писаться в новый ключ, а старый протухает по TTL.

Ключ `rate:{userId}:{номер_окна}`, счётчик `INCR` + `EXPIRE`.

```ini
INCR key          // 1-й запрос в окне
EXPIRE key ttl    // только если counter == 1
if counter > LIMIT → reject (429)
```

Плюсы: дёшево, одна команда. Минусы: **граничный эффект** — в момент смены окна можно пропустить
до 2× лимита (например лимит 100/мин: 100 запросов в последней секунде окна N и 100 в первой секунде N+1).

### 2. Sliding Window Log

Хранить timestamps каждого запроса в ZSET, вычищать старые.

```ini
ZREMRANGEBYSCORE key now-window now
ZCARD key                     // сколько запросов в скользящем окне
ZADD key now requestId        // если < LIMIT
EXPIRE key window
```

Плюсы: точный. Минусы: память O(запросов), дорог при больших лимитах.

### 3. Sliding Window Counter (гибрид) — используется в примере

Разбиваем окно на текущее и предыдущее, весим пропорционально:

```sh
count = prevCount * (elapsed/window) + curCount
```

Точность почти как у log, память — O(1): всего два счётчика на окно.

### 4. Token Bucket

Ведёрко с ёмкостью `capacity`, токены восполняются со скоростью `rate`.
Позволяет всплески (burst) до `capacity`, средняя скорость ограничена `rate`.
На Redis удобно считать в Lua, храня `tokens` и `lastRefillTs`.

## Атомарность: почему нужен Lua

Классическая гонка: `GET counter` → приложение решает → `INCR`.
Два инстанса одновременно прочитают одно значение и оба пропустят запрос — превышение лимита.

Решение — выполнить check+increment **атомарно** в Lua-скрипте (Redis исполняет скрипты последовательно,
однопоточно). Пример из приложения:

```lua
-- fixed window + защита от гонки
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if current > tonumber(ARGV[2]) then
  return {0, current}
end
return {1, current}
```

Скрипт загружается один раз (`EVALSHA`) и исполняется на сервере Redis — по сети ходят только ключи.

## Практические советы

| Тема | Рекомендация |
|---|---|
| Ключи | `rate:{scope}:{id}:{window}` — scope (ip/user/api), id — идентификатор клиента |
| TTL | Всегда ставьте EXPIRE (внутри скрипта!), иначе утечка памяти |
| Fail-open vs fail-closed | Если Redis недоступен: fail-open (пустить) для read-heavy, fail-closed для платёжных API |
| Ответ клиенту | Заголовки `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After: 429` |
| Изоляция | Разные лимиты на разные scopes (auth тяжелее, чем public GET) |
| Альтернативы | redis-cell (модуль, GCRA), прокси-уровень: nginx `limit_req`, Envoy rate limit service |

## Как запустить пример

```bash
cd "app"

# поднять redis + приложение
docker compose up -d --build

# demo-эндпоинт с лимитом 5 запросов / 10 секунд на IP
for i in $(seq 1 8); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/demo; done
# → 200 200 200 200 200 429 429 429

# тесты (внутри контейнера, против реального Redis)
docker compose run --rm app npm test
```

Подробности реализации — в [app/src/rateLimiter.js](./app/src/rateLimiter.js).
