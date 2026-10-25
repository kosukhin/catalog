# 📚 План изучения библиотеки crocks

> **crocks** — JavaScript-библиотека алгебраических типов данных (ADT) и функционального программирования.
> Официальная документация: https://crocks.dev/docs/

## Как работать с планом

Проходи уроки по порядку — каждый следующий опирается на предыдущий. После каждого урока я буду объяснять теорию с примерами, а ты сможешь задавать вопросы или просить практические задания.

**Уровни:**
- 🟢 Базовый — обязательно
- 🟡 Средний — важно для реальных задач
- 🔴 Продвинутый — для глубокого понимания

---

## Этап 0. Подготовка 🟢

### Урок 0.1 — Фундамент ФП, необходимый для crocks
- Что такое алгебраические типы данных (ADT) и зачем они в JS
- Чистые функции, иммутабельность
- Каррирование (currying)
- Композиция функций (`compose`, `pipe`)
- Установка: `npm install crocks`, варианты импорта (вся библиотека vs отдельные модули)

---

## Этап 1. Первые контейнеры 🟢

### Урок 1.1 — `Maybe`: обработка отсутствия значения
- `Just` / `Nothing`, конструктор `safe`, `maybe`, `either`
- Методы: `map`, `chain`, `alt`, `coalesce`, `option`
- Замена `if/else` и проверок на `null`

### Урок 1.2 — `Either` и `Result`: ошибки как значения
- `Left` / `Right` (и `Err` / `Ok` у Result)
- Конструкторы `safe`, `tryCatch`
- Цепочки вычислений с ошибками: `chain`, `bimap`, `either`
- Чем `Either` отличается от `Maybe`

### Урок 1.3 — `Identity`: простейший контейнер
- «Обёртка без эффекта»
- Зачем она нужна (понимание законов map/chain)

### Урок 1.4 — Ключевые методы-функции
- `map`, `chain`, `ap` — Functor, Monad, Applicative
- `liftA2`, `liftA3`
- `either`, `maybe`, `safe`, `curry` как универсальный клей

---

## Этап 2. Комбинирование данных и предикаты 🟡

### Урок 2.1 — `Pair`: пара значений
- `fst`, `snd`, конструкторы `Pair`, `toPair`
- Комбинирование двух ADT (Pair является аппликативом)

### Урок 2.2 — `Tuple`: типизированная пара (n-элементный кортеж)
- Отличие от `Pair`, `runTuple`, доступ к элементам


---

## Этап 3. Монады для состояний и окружения 🔴

### Урок 3.1 — `State`: вычисления с состоянием
- `get`, `put`, `modify`, `runState`, `evalState`, `execState`
- Когда это лучше обычных переменных

### Урок 3.2 — `Reader`: вычисления с зависимостью от окружения
- `ask`, `asks`, `runReader`, `runReaderWith`
- Dependency Injection через монаду Reader

### Урок 3.3 — `ReaderT`: Reader-трансформер над другой монадой
- Комбинирование Reader с Maybe/Either/Async
- `ask`, `lift`

### Урок 3.4 — `Const`: константный функтор
- Зачем нужен, связь с свёртками (folds)

### Урок 3.5 — `Arrow`: композиция функций как ADT
- Конструкторы: `arrow`, `fanout`, `id`, `arr`
- Комбинаторы: `first`, `second`, `both`, `then`
- Точка зрения «функция = вычисление, которое можно компоновать»

---

## Этап 4. Асинхронность 🔴

### Урок 4.1 — `Async`: асинхронные вычисления без promises
- `of`, `rejected`, `fromPromise`, `fromNode`, `resolved`
- `run`, `fork`, `bimap`, `chain`, `alt`, `race`

---

## Этап 5. Монойды 🟡

### Урок 5.1 — Что такое моноид
- Бинарная операция (`mconcat`) и нейтральный элемент (`mempty`)
- Закон ассоциативности
- `mempty`, `mappend`, `mconcat`

### Урок 5.2 — Базовые монойды
- `All`, `Any` (булевы), `Sum`, `Prod`, `Min`, `Max` (числовые)
- `Assign` (обработка пропущенных значений)
- `First`, `Last` (выбор первого/последнего значения)
- `Endo` (композиция функций)

### Урок 5.3 — Монойды в реальных задачах
- Агрегация данных (суммы, минимумы, максимумы)
- «Найти первый подходящий элемент» через `First`
- Валидация форм через `All`

---

## Этап 6. Функции-помощники и point-free стиль 🟡

### Урок 6.1 — Комбинаторы (combinators)
- `compose`, `pipe`, `curry`, `flip`, `tap`, `unit`, `constant`
- `join`, `applyTo`, `substitution`

### Урок 6.2 — Логические функции (logic)
- `and`, `or`, `not`, `xor`, `ifThen`, `ifElse`, `when`, `unless`
- `implies`, `nand`, `nor`

### Урок 6.3 — Point-free функции (pointfree)

---

## Этап 7. Итоговый проект 🎯

### Урок 7.1 — Большая практика
Собираем всё вместе, например:
- CLI-утилита парсинга данных с валидацией (`Maybe` + `Either` + `Pred`)
- Веб-скрипт с асинхронными запросами и кешированием (`Async` + `Either`)
- Система конфигурации (`Reader` + `State`)

---

## Приложение: шпаргалка по структуре библиотеки

```
crocks/
├── Arrow, Async, Const, Either, Equiv,
│   Identity, Maybe, Pair, Pred, Reader,
│   ReaderT, Result, State, Tuple
├── monoids/         All, Any, Assign, Endo, First,
│                    Last, Max, Min, Prod, Sum
├── combinators/     compose, curry, flip, tap...
├── helpers/         liftA2, either, maybe...
├── logic/           and, or, not, ifElse...
├── pointfree/       prop, path, merge, pick...
├── predicates/      isNumber, isObject, hasProp...
└── transformations/ eitherToMaybe, asyncToPromise...
```

## Рекомендуемый порядок чтения официальной документации

1. [Getting Started](https://crocks.dev/docs/getting-started.html)
2. [Maybe](https://crocks.dev/docs/crocks/Maybe.html) → [Either](https://crocks.dev/docs/crocks/Either.html) → [Result](https://crocks.dev/docs/crocks/Result.html)
3. [Pair](https://crocks.dev/docs/crocks/Pair.html) → [Tuple](https://crocks.dev/docs/crocks/Tuple.html)
4. [Async](https://crocks.dev/docs/crocks/Async.html)
5. [Monoids](https://crocks.dev/docs/crocks/monoids/) → Functions (Combinators, Logic, Point-free, Transformations)
6. [State](https://crocks.dev/docs/crocks/State.html) → [Reader](https://crocks.dev/docs/crocks/Reader.html) → [Arrow](https://crocks.dev/docs/crocks/Arrow.html)

> Готов начинать урок 0.1 — просто попроси: «Урок 0.1» 🙂

- `get`, `set`, `pick`, `omit`, `path`, `prop`, `props`
- `merge`, `concat`, `bimap` и др.
- Стиль «программирование без указания аргументов»

### Урок 6.4 — Трансформации (transformations)
- `eitherToMaybe`, `maybeToEither`, `eitherToAsync`, `asyncToPromise`...
- `pairToTuple`, `tupleToPair`
- Переходы между разными ADT при построении больших цепочек

- Почему Async — не монада Promise, и чем он лучше

### Урок 4.2 — Практика: HTTP-запросы через Async
- Композиция последовательных и параллельных запросов
- Обработка ошибок в асинхронных цепочках
