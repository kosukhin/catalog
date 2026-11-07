/* ==========================================================================
   Задания практики к уроку 0 «Термины ФП: функтор, аппликатив, монада».

   Задание — это данные:
     • type: 'input'  — ввести вывод консоли; expected — ожидаемая строка,
                        setup + expr — код, показанный в карточке (по ним же
                        ожидания сверяются скриптом проверки);
     • type: 'choice' — выбрать вариант; answer — id правильного;
     • type: 'code'   — написать выражение; target.value — ожидаемый toString,
                        target.solution — эталонное решение;
     • type: 'matrix' — таблица «значение → самый сильный интерфейс».

   Все expected и target.value прогнаны на crocks 0.12.4.
   ========================================================================== */

;(function (root) {
  'use strict'

  var tasks = [
    /* ---------------- 1. Контейнер и `of` ---------------- */
    {
      id: 'of-1',
      section: 'of',
      type: 'input',
      title: '`of` не проверяет значение',
      ask: 'Что напечатает этот код?',
      expr: 'Maybe.of(null).toString()',
      expected: 'Just null',
      hint: '`of` — не проверка, а упаковка: он берёт любое значение и кладёт его в минимальный контекст.',
      why: '`Maybe.of(null)` даёт `Just null`. Отсутствие значения создаётся отдельно: `Maybe.Nothing()` или `Maybe.zero()`.'
    },
    {
      id: 'of-2',
      section: 'of',
      type: 'choice',
      title: 'Кто создаёт `Nothing`',
      ask: 'Какой вызов вернёт `Nothing`?',
      options: [
        { id: 'a', label: '`Maybe.of(null)`', short: 'Maybe.of(null)' },
        { id: 'b', label: '`Maybe.Just(null)`', short: 'Maybe.Just(null)' },
        { id: 'c', label: '`Maybe.Nothing()`', short: 'Maybe.Nothing()' },
        { id: 'd', label: "`Maybe.of('null')`", short: 'Maybe.of("null")' }
      ],
      answer: 'c',
      hint: '`of` и `Just` — упаковка без проверок.',
      why: '`Maybe.of(null)` и `Maybe.Just(null)` дают `Just null`: значение внутри есть, просто это `null`. `Nothing` создаётся явно (`Maybe.Nothing()`, `Maybe.zero()`) или проверкой (`safe`).'
    },

    /* ---------------- 2. Функтор ---------------- */
    {
      id: 'fun-1',
      section: 'functor',
      type: 'input',
      title: '`map` сохраняет контекст',
      ask: 'Что напечатает этот код?',
      setup: 'const toUpper = s => s.toUpperCase()',
      expr: 'Nothing().map(toUpper).toString()',
      expected: 'Nothing',
      hint: 'Что `map` делает с контекстом? Меняется ли форма пустого контейнера?',
      why: '`map` применяет функцию только к значению внутри. У `Nothing` значения нет, поэтому функция даже не вызывается, а форма контекста сохраняется.'
    },
    {
      id: 'fun-2',
      section: 'functor',
      type: 'input',
      title: '`map` не трогает контекст `Pair`',
      ask: 'Что напечатает этот код?',
      expr: "Pair('log', 2).map(n => n * 10).toString()",
      expected: 'Pair( "log", 20 )',
      hint: 'У `Pair` первый компонент — накапливаемый контекст (лог), второй — значение.',
      why: '`map` у `Pair` меняет только второй компонент: `Pair( "log", 20 )`. Первый компонент — контекст, его нельзя потерять.'
    },
    {
      id: 'fun-3',
      section: 'functor',
      type: 'choice',
      title: 'Закон композиции функтора',
      ask: '`m.map(f).map(g)` эквивалентно…',
      options: [
        { id: 'a', label: '`m.map(x => f(g(x)))`', short: 'm.map(x => f(g(x)))' },
        { id: 'b', label: '`m.map(x => g(f(x)))`', short: 'm.map(x => g(f(x)))' },
        {
          id: 'c',
          label: '`m.chain(x => g(f(x)))`',
          short: 'm.chain(x => g(f(x)))'
        },
        {
          id: 'd',
          label: '`m.map(f).ap(m.map(g))`',
          short: 'm.map(f).ap(m.map(g))'
        }
      ],
      answer: 'b',
      hint: 'Подставь в каждый вариант конкретное число `x` и посчитай, что получится при двух `map` подряд.',
      why: 'Два `map` подряд — это «сначала `f`, затем `g`», то есть `x => g(f(x))`. Вариант `m.map(x => f(g(x)))` равен `m.map(g).map(f)` — обратный порядок.'
    },
    {
      id: 'fun-4',
      section: 'functor',
      type: 'input',
      title: 'Константный функтор ничего не меняет',
      ask: 'Что напечатает этот код?',
      expr: "Const(String)('log').map(x => x * 1000).toString()",
      expected: 'Const(String) "log"',
      hint: 'В `Const c a` тип `a` фантомный: значения этого типа в контейнере нет.',
      why: '`map` у `Const` — это `identity` на накопленном значении: аккумулятор `"log"` остаётся тем же. Поэтому его и называют константным (дельта) функтором.'
    },
    {
      id: 'code-1',
      section: 'functor',
      type: 'code',
      title: 'Собери `Just 6`',
      ask: 'Начни с `Just(3)` и получи `Just 6`. Функция внутри должна возвращать обычное число — контекст при этом не меняется.',
      placeholder: 'одно выражение, начни с Just(3)',
      target: {
        value: 'Just 6',
        solution: 'Just(3).map(x => x * 2)',
        nestedTip: '`map` не сплющивает контейнеры — проверь, что функция возвращает число, а не `Maybe`.'
      },
      hint: 'Посмотри, что возвращает функция внутри: если это обычное число, контекст остаётся одним слоем. Какая операция подходит для такого шага?',
      why: '`Just(3).map(x => x * 2)` → `Just 6`. `chain` здесь не нужен: шаг не возвращает контейнер.'
    },

    /* ---------------- 3. Аппликатив ---------------- */
    {
      id: 'app-1',
      section: 'applicative',
      type: 'input',
      title: '`liftA2` и пустой контекст',
      ask: 'Что напечатает этот код?',
      setup: 'const add = curry((a, b) => a + b)',
      expr: 'liftA2(add, Just(10), Nothing()).toString()',
      expected: 'Nothing',
      hint: 'Разложи `liftA2` на `m1.map(fn).ap(m2)` и посмотри, что делает `ap`, если второй контейнер пуст.',
      why: 'Аппликатив комбинирует независимые вычисления, но если хотя бы один контекст пуст, результат пуст: `Nothing`.'
    },
    {
      id: 'app-2',
      section: 'applicative',
      type: 'choice',
      title: 'Что `liftA2` требует от функции',
      ask: 'Какой должна быть функция, которую получает `liftA2`?',
      options: [
        {
          id: 'a',
          label: 'Обычной функцией двух аргументов',
          short: 'обычная функция двух аргументов'
        },
        { id: 'b', label: 'Каррированной', short: 'каррированная функция' },
        {
          id: 'c',
          label: 'Функцией, возвращающей контейнер',
          short: 'функция, возвращающая контейнер'
        },
        { id: 'd', label: 'Моноидом', short: 'моноид' }
      ],
      answer: 'b',
      hint: 'Внутри `liftA2` делает `m1.map(fn).ap(m2)`.',
      why: 'После `map` в контейнере должна остаться функция с одним свободным аргументом, значит исходная функция обязана быть каррированной. Иначе — `TypeError: Maybe.ap: Wrapped value must be a function`.'
    },
    {
      id: 'app-3',
      section: 'applicative',
      type: 'input',
      title: '`Either.ap` не накапливает ошибки',
      ask: 'Что напечатает этот код?',
      setup: 'const add = curry((a, b) => a + b)',
      expr: "Either.of(add).ap(Left('a')).ap(Left('b')).toString()",
      expected: 'Left "a"',
      hint: 'Для накопления нужен `Result` с массивом внутри `Err`.',
      why: '`Either.ap` коротко замыкается на первой ошибке: `Left "a"`. «Копить ошибки» — свойство `Result.ap`, а не аппликатива «вообще».'
    },
    {
      id: 'app-4',
      section: 'applicative',
      type: 'input',
      title: '`Result` собирает все независимые ошибки',
      ask: 'Что напечатает этот код?',
      setup: [
        'const add = curry((a, b) => a + b)',
        "const isPositive = n => n > 0 ? Ok(n) : Err(['должно быть > 0'])",
        "const isEven = n => n % 2 === 0 ? Ok(n) : Err(['должно быть чётным'])"
      ].join('\n'),
      expr: 'liftA2(add, isPositive(-2), isEven(3)).toString()',
      expected: 'Err [ "должно быть > 0", "должно быть чётным" ]',
      hint: 'Обе проверки независимы — поэтому ошибки складываются в один массив.',
      why: '`Result.ap` накапливает ошибки в массив: `Err [ "должно быть > 0", "должно быть чётным" ]`. Порядок — как у аргументов `liftA2`.'
    },

    /* ---------------- 4. Монада ---------------- */
    {
      id: 'mon-1',
      section: 'monad',
      type: 'input',
      title: '`map` и функция, возвращающая `Maybe`',
      ask: 'Что напечатает этот код?',
      setup: 'const half = n => n % 2 === 0 ? Just(n / 2) : Nothing()',
      expr: 'Just(4).map(half).toString()',
      expected: 'Just Just 2',
      hint: 'Сколько слоёв контейнера получится, если функция сама возвращает `Maybe`?',
      why: '`map` сохраняет форму контекста и не убирает лишний слой — отсюда `Just Just 2`. Для шага, который сам возвращает контейнер, нужен `chain`.'
    },
    {
      id: 'mon-2',
      section: 'monad',
      type: 'input',
      title: '`chain` сплющивает один слой',
      ask: 'Что напечатает этот код?',
      setup: 'const half = n => n % 2 === 0 ? Just(n / 2) : Nothing()',
      expr: 'Just(4).chain(half).toString()',
      expected: 'Just 2',
      hint: '`chain` — это «`map` + проткнуть один слой контейнера».',
      why: '`chain` применяет функцию `a -> m b` и сплющивает результат: `Just 2`. Поэтому цепочки зависимых шагов пишутся через `chain`.'
    },
    {
      id: 'mon-3',
      section: 'monad',
      type: 'choice',
      title: 'Законы монады',
      ask: 'Какое свойство нарушено, если `m.chain(f).chain(g)` не равно `m.chain(x => f(x).chain(g))`?',
      options: [
        { id: 'a', label: 'Левая идентичность: `of(a).chain(f) ≡ f(a)`' },
        { id: 'b', label: 'Правая идентичность: `m.chain(of) ≡ m`' },
        { id: 'c', label: 'Ассоциативность' },
        { id: 'd', label: 'Тождество функтора' }
      ],
      answer: 'c',
      hint: 'Сверься с тремя законами монады в разделе 4: какой из них говорит о перегруппировке цепочки?',
      why: 'Это закон ассоциативности. Благодаря ему длинную цепочку `chain` можно разбивать на отдельные функции и склеивать обратно, не меняя результат.'
    },
    {
      id: 'code-2',
      section: 'monad',
      type: 'code',
      title: 'Собери `Just 4` через `chain`',
      prelude: 'const half = n => n % 2 === 0 ? Just(n / 2) : Nothing()',
      ask: 'Готовый `half` определён выше. Начни с `Just(8)` и получи `Just 4`. Обрати внимание: шаг сам возвращает `Maybe`.',
      placeholder: 'одно выражение, начни с Just(8)',
      target: {
        value: 'Just 4',
        solution: 'Just(8).chain(half)',
        nestedTip: 'Для шага, который сам возвращает `Maybe`, нужен `chain` — он сплющивает лишний слой.'
      },
      hint: 'Если применить шаг, вернувший `Maybe`, получится два слоя. Какая операция «сплющивает» один слой?',
      why: '`Just(8).chain(half)` → `Just 4`. С `map` получилось бы `Just Just 4`.'
    },

    /* ---------------- 5. Иерархия интерфейсов ---------------- */
    {
      id: 'hier-1',
      section: 'hierarchy',
      type: 'matrix',
      title: 'Кто какой уровень проходит',
      ask: 'Для каждого значения выбери самый сильный интерфейс, который подтверждают предикаты crocks: `isFunctor`, `isApply`, `isApplicative`, `isChain`, `isMonad`.',
      options: [
        {
          id: 'monad',
          label: 'функтор + `of` + `ap` + `chain` (монада)',
          short: 'монада: map + of + ap + chain'
        },
        {
          id: 'apply',
          label: 'функтор + `ap` + `chain`, но без `of`',
          short: 'без `of`: map + ap + chain'
        },
        { id: 'functor', label: 'только `map`', short: 'только `map`' },
        {
          id: 'none',
          label: 'ни `map`, ни `chain` (например, моноид)',
          short: 'ничего из этого'
        }
      ],
      rows: [
        { id: 'maybe', label: 'Maybe.of(1)', answer: 'monad' },
        { id: 'pair', label: "Pair(['log'], 1)", answer: 'apply' },
        { id: 'tuple', label: 'Tuple(2)(1, 2)', answer: 'functor' },
        { id: 'sum', label: 'Sum(1)', answer: 'none' }
      ],
      hint: 'Предикаты вложены: `isFunctor` → `isApply` → `isApplicative` (нужен `of`) → `isChain` → `isMonad`.',
      why: '`Maybe.of(1)` проходит всё. `Pair` умеет `map`/`ap`/`chain`, но без `of` — поэтому `isApplicative` и `isMonad` дают `false`. `Tuple` — только функтор. `Sum` — моноид, а не функтор.'
    },
    {
      id: 'hier-2',
      section: 'hierarchy',
      type: 'choice',
      title: 'Почему `Pair` не проходит `isMonad`',
      ask: 'Почему `isMonad(Pair(...))` возвращает `false`, хотя `Pair.chain` работает?',
      options: [
        { id: 'a', label: 'У `Pair` нет `map`' },
        {
          id: 'b',
          label: 'Предикат `isMonad` требует `of`, а у `Pair` его нет',
          short: 'isMonad требует `of`, которого у `Pair` нет'
        },
        { id: 'c', label: 'У `Pair` нет `chain`' },
        { id: 'd', label: '`Pair` — моноид' }
      ],
      answer: 'b',
      hint: 'Предикаты вложены: чтобы пройти `isMonad`, нужно пройти все предыдущие уровни. Какого из них не хватает `Pair`?',
      why: '`isMonad` = `isApplicative` + `chain`, а `isApplicative` требует `of`. У `Pair` нет `of` — отсюда `false`. Это расхождение между определением «по операциям» и строгостью проверки библиотеки.'
    },

    /* ---------------- 6. Три операции на одном примере ---------------- */
    {
      id: 'mix-1',
      section: 'mixed',
      type: 'choice',
      title: 'Независимые проверки + зависимый шаг',
      ask: 'Форма: имя и возраст проверяются независимо, затем по готовому пользователю загружается заказ. Какой набор операций подходит?',
      options: [
        {
          id: 'a',
          label: '`chain` для проверок, `liftA2` для загрузки',
          short: '`chain` для проверок, `liftA2` для загрузки'
        },
        {
          id: 'b',
          label: '`ap` и для проверок, и для загрузки',
          short: '`ap` и там, и там'
        },
        {
          id: 'c',
          label: '`liftA2` для проверок, `chain` для загрузки',
          short: '`liftA2` для проверок, `chain` для загрузки'
        },
        { id: 'd', label: 'Только `map`', short: 'только `map`' }
      ],
      answer: 'c',
      hint: 'В форме два независимых поля и один зависимый шаг. Вспомни разницу: `ap`/`liftA2` комбинируют независимые вычисления, `chain` — зависимые.',
      why: 'Проверки независимы, поэтому `liftA2` комбинирует их и собирает все ошибки сразу. Загрузка зависит от готового пользователя — это `chain`.'
    },
    {
      id: 'mix-2',
      section: 'mixed',
      type: 'input',
      title: 'Аппликатив на форме',
      ask: 'Что напечатает этот код?',
      setup: [
        'const makeUser = curry((name, age) => ({ name, age }))',
        "const validateName = v => v.trim() ? Ok(v.trim()) : Err(['имя пустое'])",
        "const validateAge = v => v >= 18 ? Ok(v) : Err(['нужен 18+'])"
      ].join('\n'),
      expr: "liftA2(makeUser, validateName('  Ivan  '), validateAge(17)).toString()",
      expected: 'Err [ "нужен 18+" ]',
      hint: 'Имя нормальное, возраст — нет. Сколько ошибок попадёт в массив?',
      why: '`liftA2` с `Result` собирает ошибки всех независимых проверок: имя прошло, возраст нет — `Err [ "нужен 18+" ]`.'
    }
  ]

  var lesson = {
    id: 'lesson-0',
    title: 'Урок 0 — Термины ФП',
    next: 'Следующий урок — **0.1 «Фундамент ФП»**: чистые функции, иммутабельность, каррирование и композиция.',
    sections: [
      { id: 'of', title: '1. Контейнер и `of`', note: 'раздел 1 урока' },
      { id: 'functor', title: '2. Функтор: `map`', note: 'раздел 2 урока' },
      {
        id: 'applicative',
        title: '3. Аппликатив: `of` + `ap`',
        note: 'раздел 3 урока'
      },
      { id: 'monad', title: '4. Монада: `of` + `chain`', note: 'раздел 4 урока' },
      {
        id: 'hierarchy',
        title: '5. Иерархия интерфейсов и предикаты',
        note: 'раздел 5 урока'
      },
      {
        id: 'mixed',
        title: '6. Три операции на одном примере',
        note: 'раздел 6 урока'
      }
    ],
    tasks: tasks
  }

  root.LESSON_0 = lesson
  if (root.Practice) root.Practice.lesson(lesson)
})(typeof window !== 'undefined' ? window : globalThis)
