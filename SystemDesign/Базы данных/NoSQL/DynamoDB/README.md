# DynamoDB

> **Коротко:** полностью управляемая serverless NoSQL-база от AWS (key-value + документы) с предсказуемой задержкой в единицы миллисекунд на любом объёме данных. Серверы, реплики и шардирование не администрируются, но **access patterns нужно знать заранее** — произвольные запросы, JOIN и агрегации в самой БД невозможны.

## Что такое DynamoDB

- NoSQL-хранилище типа **key-value / document**, запущено в AWS с 2012 года (идейный наследник Amazon Dynamo).
- Данные лежат в **таблицах**, состоящих из **items** (аналог строк) с **attributes** (аналог полей). Кроме ключей схема отсутствует.
- **Полностью managed**: AWS сама делает репликацию, failover, шардирование, патчи и масштабирование.
- **Serverless-модель оплаты**: on-demand (за запросы) или provisioned (за RCU/WCU), без выделенных серверов.
- **Единицы миллисекунд** на чтение/запись при любом размере таблицы — если ключ распределён равномерно.
- Взаимодействие только через **API/SDK** (HTTP + JSON), SQL нет.
- Внутри региона данные автоматически реплицируются в **3 Availability Zone**.

## Модель данных

| Понятие | Что это |
|---|---|
| Table | Набор items, не требует описания всех атрибутов |
| Item | Группа атрибутов, уникально идентифицируемая ключом; **максимум 400 KB** |
| Attribute | Поле; поддерживаются скаляры, списки, map и set |
| Partition key (PK) | Обязательный ключ, по его хешу выбирается партиция |
| Sort key (SK) | Необязательный ключ, задаёт порядок items внутри одной партиции |

Ключи задаются при создании таблицы и **не меняются**. Всё остальное — schemaless: у разных items могут быть разные атрибуты.

Типы атрибутов: `S` (string), `N` (number), `B` (binary), `BOOL`, `NULL`, `L` (list), `M` (map), `SS`, `NS`, `BS` (sets). Вложенность — до 32 уровней. Ограничения: PK ≤ 2048 байт, SK ≤ 1024 байт, item ≤ 400 KB (включая имена атрибутов).

Пример item в таблице `App` (single-table design):

```json
{
  "PK": "USER#123",
  "SK": "ORDER#2026-11-19#9001",
  "entity": "Order",
  "status": "PAID",
  "total": 4990,
  "items": [{ "sku": "A-1", "qty": 2 }],
  "GSI1PK": "USER#123#STATUS#PAID",
  "GSI1SK": "2026-11-19T10:15:00Z"
}
```

Здесь `PK`/`SK` — ключ таблицы, а `GSI1PK`/`GSI1SK` — обычные атрибуты, по которым построен глобальный вторичный индекс.

## Как читаются данные

| Операция | Что делает | Стоимость |
|---|---|---|
| `GetItem` | Один item по полному ключу | 1 запрос, дёшево |
| `Query` | Items по одной PK + условию на SK (`=`, `<`, `begins_with`, `between`) | Пропорциональна найденным данным, до 1 MB на страницу |
| `Scan` | Перебирает **всю** таблицу или индекс | Дорого: платите за все прочитанные items |
| `BatchGetItem` / `BatchWriteItem` | Пачка до 100 чтений / 25 записей | Часть запросов может упасть — нужен retry |
| `TransactGetItems` / `TransactWriteItems` | Атомарная транзакция до 100 items / 4 MB | Удвоенная ёмкость, ACID только в одном регионе |

- Результат `Query`/`Scan` пагинируется: в ответе приходит `LastEvaluatedKey`, его нужно передать в следующий запрос.
- **JOIN нет.** Связанные сущности либо кладут рядом (одна PK, разные SK), либо денормализуют, либо читают несколькими запросами.
- **Агрегаций нет** (`SUM`, `GROUP BY`, `COUNT` по всей таблице — только клиентская обработка или zero-ETL в Redshift/OpenSearch).

### Вторичные индексы

| | GSI (Global Secondary Index) | LSI (Local Secondary Index) |
|---|---|---|
| Ключ | Свой PK + SK, может отличаться от таблицы | Тот же PK, другой SK |
| Консистентность | **Только eventual** | Strong и eventual |
| Когда создаётся | В любой момент | Только при создании таблицы |
| Лимит | 20 по умолчанию (можно увеличить) | 5 |
| Особенность | Своя ёмкость, может троттлиться отдельно | Общая партиция, item collection ≤ 10 GB |

Индекс хранит только спроецированные атрибуты: `KEYS_ONLY`, `INCLUDE` (список) или `ALL`. Чем шире проекция, тем дороже запись.

### Single-table design

В DynamoDB принято хранить разные сущности в одной таблице, кодируя тип в ключе (`USER#123`, `ORDER#9001`, `ITEM#1`). Тогда типовые запросы — это один `Query`:

| Задача | Запрос |
|---|---|
| Профиль пользователя | `PK = USER#123, SK = PROFILE` |
| Заказы пользователя | `PK = USER#123, begins_with(SK, "ORDER#")` |
| Позиции заказа | `PK = ORDER#9001, begins_with(SK, "ITEM#")` |
| Заказы пользователя по статусу | GSI1: `PK = USER#123#STATUS#PAID` |

Плата за это — жёсткая привязка модели к списку запросов и сложность изменения модели задним числом.

## Ёмкость и масштабирование

**Provisioned mode** — вы задаёте RCU/WCU:

- 1 WCU = 1 запись в секунду для item до 1 KB.
- 1 RCU = 1 strongly consistent чтение в секунду для item до 4 KB (или 2 eventual-чтения).
- Размер item округляется вверх: запись 2.5 KB стоит 3 WCU, чтение 3 KB — 1 RCU (strong) или 0.5 RCU (eventual).

**On-demand mode** — ёмкость не планируется, платите за request units (WRU/RRU). Удобно для непредсказуемого и «рваного» трафика; при стабильно высокой нагрузке provisioned + reserved capacity обычно дешевле.

Как устроено физически:

- Items раскладываются по партициям по хешу PK. Ориентир на партицию: **~10 GB, 3000 RCU, 1000 WCU**.
- Слишком «горячий» ключ (например, `status = "NEW"` или один крупный tenant) упирается в лимит партиции — это **hot partition**. Лечится высококардинальным ключом или шардированием ключа (`tenant#42#0..N`).
- Adaptive capacity автоматически перераспределяет нагрузку, но не спасает от плохого дизайна ключа.
- On-demand масштабируется сам, однако резкий скачок может привести к throttling; для запланированных пиков есть **warm throughput**.
- Переключение provisioned → on-demand — до 4 раз в сутки; обратно — в любой момент.

## Консистентность и надёжность

- По умолчанию чтение **eventually consistent** (дешевле в 2 раза). Per-request можно запросить **strongly consistent** чтение с базовой таблицы или LSI.
- **GSI всегда eventually consistent** — сразу после записи данные в индексе могут быть ещё не видны.
- Запись item атомарна; есть **условные записи** (`ConditionExpression`) — на них строят optimistic locking (атрибут `version`) и идемпотентность.
- **Транзакции** (`TransactWriteItems`) дают ACID для ≤ 100 items / 4 MB **в пределах одного региона**. Между регионами транзакций нет.
- Внутри региона данные реплицируются в 3 AZ. SLA — **99.99%**; для Global Tables — **99.999%**.
- **Global Tables** — multi-region, active-active: писать можно в любой регион, репликация асинхронная (обычно доли секунды), конфликты решаются **last-writer-wins** по timestamp.
- Бэкапы: **PITR на 35 дней**, on-demand backup, экспорт в S3 (не тратит RCU), импорт из S3.

## Встроенные возможности

| Возможность | Зачем |
|---|---|
| **DynamoDB Streams** | CDC-поток изменений (24 часа), триггеры Lambda, интеграция с Kinesis |
| **TTL** | Автоудаление items по timestamp; бесплатно, удаление обычно в течение 48 часов |
| **DAX** | In-memory кэш с микросекундным чтением и write-through, для read-heavy сценариев |
| **Global Tables** | Мультирегиональная active-active репликация |
| **Zero-ETL** | Репликация в Redshift / OpenSearch без собственного пайплайна |
| **Vector search** | Нативные vector-индексы (GA с августа 2026): до 4096 измерений, `SearchVectors`, TopK ≤ 100, фильтры по обычным атрибутам |
| **Безопасность** | Шифрование at rest (KMS), TLS, тонкий IAM, VPC endpoints, CloudTrail |
| **DynamoDB Local / LocalStack** | Локальная разработка и тесты без AWS |

## MongoDB в двух словах

MongoDB — документная NoSQL-БД общего назначения:

- Хранит **BSON-документы** (до **16 MB**) в коллекциях; схема гибкая, но можно включить JSON Schema validation.
- **Богатый язык запросов**: равенства, диапазоны, regex, гео, текст, вложенные поля; **aggregation pipeline** (`$match`, `$group`, `$lookup`, `$facet`), фактически JOIN через `$lookup`.
- Много типов индексов: compound, multikey, text, geospatial, TTL, partial, wildcard, unique; в Atlas — Search и Vector Search.
- **Replica set** (primary + secondary, автоматический failover) с настраиваемыми `readPreference`, `readConcern`, `writeConcern`.
- **Шардирование** по shard key (hash/range/zone), горизонтальное масштабирование.
- **Multi-document ACID-транзакции** (с 4.0 в replica set, с 4.2 в шардированном кластере).
- Разворачивается **самостоятельно** (Community под SSPL, Enterprise под коммерческой лицензией) или в **Atlas** (managed, в т.ч. multi-cloud).
- Change streams, time series collections, capped collections.

Ключевое отличие: MongoDB — универсальная БД «под запросы», DynamoDB — специализированная БД «под известные access patterns и масштаб».

## DynamoDB vs MongoDB

| Критерий | DynamoDB | MongoDB |
|---|---|---|
| Модель | Key-value + документы | Документы (BSON) |
| Схема | Schemaless, но ключи и индексы фиксированы | Schemaless + опциональная валидация |
| Размер единицы | Item ≤ **400 KB** | Документ ≤ **16 MB** |
| Запросы | Только по ключу/индексу: `GetItem`, `Query`, `Scan` | Произвольные фильтры, regex, гео, текст |
| JOIN | Нет | `$lookup` в aggregation pipeline |
| Агрегации | Нет (клиент или zero-ETL) | Полноценный pipeline |
| Индексы | PK/SK + GSI (20) / LSI (5), только ключевые условия | Много типов, включая compound, text, geo, wildcard |
| Транзакции | ≤ 100 items / 4 MB, один регион | Multi-document, ACID, с накладными расходами |
| Консистентность | Eventual по умолчанию, strong по запросу; GSI — только eventual | Настраивается через read/write concern |
| Масштабирование | Автоматическое, шардирование скрыто | Vertical + sharding по shard key |
| Латентность | Единицы мс, предсказуемая | Обычно мс, зависит от индексов и нагрузки |
| Multi-region | Global Tables, active-active | Replica set + Atlas zone sharding (у каждого шарда свой primary) |
| Эксплуатация | Полностью managed, serverless | Self-hosted (нужен DBA) или Atlas |
| Оплата | За запросы или RCU/WCU + storage | За инфраструктуру: инстансы, IOPS, storage |
| Vendor lock-in | Высокий: API AWS, полноценного OSS-аналога нет | Ниже: есть OSS (SSPL) и self-host |
| Локальная разработка | DynamoDB Local, LocalStack | Docker, запускается просто |
| Порог входа | Нужен data modeling под access patterns | Привычнее: запросы ближе к SQL |

Осторожно с упрощениями про CAP: DynamoDB нельзя назвать «чисто AP» — внутри региона доступны strongly consistent чтения, но GSI и Global Tables дают eventual-поведение. MongoDB по умолчанию читает с primary (строго), а с secondary — eventual.

## Почему стоит выбирать DynamoDB

1. **Ноль эксплуатации.** Нет серверов, реплик, failover, обновлений и ручного шардирования — всё делает AWS.
2. **Предсказуемая задержка.** Single-digit milliseconds на чтение/запись при росте таблицы до сотен TB — при условии равномерного ключа.
3. **Автоматический масштаб.** Выдерживает экстремальные пики (исторически — Prime Day), не требуя capacity planning в on-demand режиме.
4. **Отказоустойчивость «из коробки».** 3 AZ, SLA 99.99%, PITR, бэкапы, шифрование.
5. **Мультирегион.** Global Tables дают active-active и SLA 99.999% без собственной репликации.
6. **Оплата по факту.** On-demand удобен для MVP, сезонного и рваного трафика: нет простаивающих инстансов.
7. **Интеграция с AWS.** IAM, Lambda, Streams, EventBridge Pipes, API Gateway, AppSync, CDK/CloudFormation — меньше склеивающего кода.
8. **Готовые паттерны.** TTL, Streams (CDC), DAX, zero-ETL, vector search закрывают типовые задачи без отдельных систем.
9. **Безопасность и аудит.** Тонкие IAM-политики вплоть до атрибутов, KMS, VPC endpoints, CloudTrail.
10. **Дешёвый простой.** Нет трафика — почти нет счёта (в отличие от постоянно работающего кластера MongoDB).

### Когда DynamoDB — плохой выбор

- **Access patterns неизвестны** или продукт активно меняется: каждый новый запрос может потребовать нового GSI и переделки модели.
- **Нужна аналитика и ad-hoc отчёты** (`GROUP BY`, произвольные фильтры) — это Redshift/ClickHouse/BigQuery, а не DynamoDB.
- **Полнотекстовый поиск, фасеты, релевантность** — OpenSearch/Typesense.
- **Большие объекты** (медиа, PDF, логи > 400 KB) — S3 + ссылка в item.
- **Сложные связи и реляционная целостность** — PostgreSQL.
- **On-prem, multi-cloud или обязательный open source** — MongoDB, Cassandra/ScyllaDB.
- **Стабильно высокий ровный трафик** с жёстким бюджетом: on-demand может выйти дорого, а provisioned требует точного прогноза.
- **Команда не готова разбираться в key design**: цена ошибки — hot partitions и throttling в проде.

## За что платите

Счёт складывается из:

- **Запись**: WRU/WCU. Item округляется вверх до 1 KB.
- **Чтение**: RRU/RCU. Item округляется вверх до 4 KB; strongly consistent чтение стоит в 2 раза дороже eventual.
- **Storage**: за GB-месяц.
- **Дополнительно**: PITR и бэкапы, узлы DAX, трафик между регионами, реплицированные записи Global Tables.

Пример расчёта:

```text
1000 записей/с, item 2 KB          → 1000 × 2 = 2000 WCU (или WRU/с)
3000 eventual-чтений/с, item 6 KB   → ceil(6/4) = 2 блока по 4 KB, 0.5 RCU каждый
                                   → 3000 × 1 = 3000 RCU (strong было бы 6000)
GSI с проекцией ALL               → запись дополнительно оплачивается как запись в индекс
```

Главные статьи перерасхода:

- `Scan` вместо `Query` — платите за всю таблицу.
- «Горячий» ключ — throttling при формально достаточной ёмкости.
- Слишком много GSI с широкой проекцией — удорожание каждой записи.
- On-demand при ровной высокой нагрузке — дороже provisioned + reserved capacity.
- Отсутствие retry с exponential backoff и идемпотентности — лишние запросы.

## Чек-лист перед выбором

1. Выписать **все access patterns** до проектирования таблицы.
2. Проверить кардинальность PK и равномерность нагрузки (нет ли tenant-гиганта).
3. Убедиться, что items ≤ 400 KB; крупные объекты — в S3.
4. Понять, какие выборки нужны: диапазоны по SK, фильтры и сортировки → GSI.
5. Решить, где допустима eventual consistency (GSI, Global Tables).
6. Оценить трафик и посчитать стоимость в on-demand и provisioned.
7. Проверить необходимость multi-region и стратегию разрешения конфликтов (LWW).
8. Продумать экспорт/миграцию: lock-in у DynamoDB высокий.
9. Заложить мониторинг: `ThrottledRequests`, `ConsumedCapacity`, Contributor Insights.
10. Для критичных операций — conditional writes, транзакции, idempotency token.

## Пример таблицы и запроса

```bash
aws dynamodb create-table \
  --table-name App \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
      AttributeName=GSI1PK,AttributeType=S \
      AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes '[{
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
        {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST

aws dynamodb query \
  --table-name App \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"USER#123"},":sk":{"S":"ORDER#"}}'
```

## Итог

- **DynamoDB** — managed serverless key-value/document БД: предсказуемые миллисекунды, автоматический масштаб, zero-ops, multi-region, оплата за запросы. Цена — отсутствие произвольных запросов, JOIN и агрегаций, а также жёсткая привязка модели к access patterns.
- **MongoDB** — универсальная документная БД: богатый язык запросов, агрегации, гибкие индексы, крупные документы, self-host или Atlas. Плата — необходимость эксплуатации (или стоимость managed) и более сложное масштабирование.
- **DynamoDB выбирают**, когда нагрузка большая и/или непредсказуемая, access patterns известны, инфраструктура уже в AWS и нужен минимум операций.
- **MongoDB выбирают**, когда важнее гибкость запросов и скорость разработки, документы крупные, нужен multi-cloud/on-prem или команда уже умеет с ним работать.
- Главный риск DynamoDB — **data modeling**, главный риск MongoDB — **эксплуатация и шардирование** на масштабе.

## Ссылки

- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [DynamoDB quotas](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html)
- [DynamoDB constraints](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [Dynamo paper (2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)




