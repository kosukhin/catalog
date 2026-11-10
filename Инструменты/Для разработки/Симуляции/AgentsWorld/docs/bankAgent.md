# `agents/bankAgent.ts` — банк

Банк мира: заводит людям счёта и списывает деньги. Счёт открывается с депозитом
1000 (настройка `deposit`).

## Что экспортирует

| Экспорт | Назначение |
|---|---|
| `type` | `'BankAgent'` |
| `moduleUrl`, `createAgent` | контракт модуля агента |
| `BankAgent` | класс |
| `BANK_AGENT_ID` | `'BankAgent-1'` |
| `BANK_OPEN`, `BANK_ACCOUNT`, `BANK_CHARGE`, `BANK_PAYMENT` | типы сообщений |
| `AccountReport`, `PaymentReport` | типы данных |

## Сообщения

| Сообщение | Полезная нагрузка | Что делает банк |
|---|---|---|
| `bank-open` | `{ owner, replyTo }` | заводит счёт с депозитом (повторно — не сбрасывает) и отвечает `bank-account` |
| `bank-account` | `{ owner, balance }` | ответ: сколько на счёте |
| `bank-charge` | `{ owner, amount, replyTo }` | списывает `amount`, если денег хватает; отвечает `bank-payment` |
| `bank-payment` | `{ owner, amount, accepted, balance, reason }` | ответ: прошло ли списание |

## Инварианты

- Повторное `bank-open` не обнуляет баланс.
- Списание без счёта или при нехватке денег — `accepted: false` с причиной, баланс не меняется.
- Ответ без `replyTo` пишется в лог.
- `describe()` отдаёт депозит и число счетов — банк виден в дашборде.

## Тест

`test/bankAgent.test.ts` — контракт модуля, открытие счёта с депозитом, повторное
открытие, успешное списание, отказ при нехватке и без счёта, состояние для
дашборда, незнакомое сообщение, проверка настроек.

## Разложение на подмодули

| Подмодуль | Что содержит |
|---|---|
| `agents/bank/accounts.ts` | типы `ChargeRequest`/`PaymentReport`, отправка отчёта (`send`, `pay`) |
| `agents/bank/requests.ts` | разбор `owner`, `amount`, `replyTo`, опция `deposit` |

Класс держит `#status` (`deposit` + `accounts`) и методы `state()`, `start`,
`handle`, `describe`. Геттеров `deposit`/`accountCount` больше нет.

## Тест

`test/bankAgent.test.ts` — открытие счёта, повторное открытие, списание,
недостаток средств, отсутствие счёта, отчёты об оплате.
