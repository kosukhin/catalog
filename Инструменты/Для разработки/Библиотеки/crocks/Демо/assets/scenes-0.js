/* ==========================================================================
   Демосцены к уроку 0 «Термины ФП: функтор, аппликатив, монада».

   Сцена — это данные:
     • id / kicker / title / idea / hint — текст карточки;
     • controls — что можно крутить: select, chips, range, text;
     • run(state, crocks) → { view, steps } — считает значения на настоящем
       crocks; steps[i].value — живой вывод библиотеки, steps[i].expect —
       статический эталон, записанный руками (см. почему в demo.js);
     • draw(view, stage, kit) — рисует визуализацию из того, что вернул run.

   Эталоны (expect) сверены с crocks 0.12.4 скриптом scripts/check-demo.mjs
   при всех положениях контролов: npm run check:demo
   ========================================================================== */

;(function (root) {
  'use strict'

  /* ------------------------------------------------------------------ */
  /* общие помощники сцен                                               */
  /* ------------------------------------------------------------------ */

  function q(value) {
    return JSON.stringify(value)
  }

  function errList(items) {
    return 'Err [ ' + items.map(q).join(', ') + ' ]'
  }

  /* ------------------------------------------------------------------ */
  /* сцена 1. `of` — конвейер упаковки (раздел 1)                       */
  /* ------------------------------------------------------------------ */

  var OF_VALUES = {
    num: { code: '42', js: 42, text: '42' },
    nul: { code: 'null', js: null, text: 'null' },
    undef: { code: 'undefined', js: undefined, text: 'undefined' },
    zero: { code: '0', js: 0, text: '0' },
    str: { code: "'null'", js: 'null', text: '"null"' }
  }

  var OF_PREFIX = { Maybe: 'Just ', Either: 'Right ', Result: 'Ok ' }

  var sceneOf = {
    id: 'of',
    kicker: 'сцена 1 · раздел 1',
    title: '`of` — конвейер упаковки',
    idea:
      '`of` превращает обычное значение в контейнер и **не смотрит на значение**. ' +
      'Коробка одна и та же, меняется только то, что внутри. Поэтому ' +
      '`Maybe.of(null)` — это `Just null`, а не `Nothing`.',
    hint:
      'Сравни `null` и `undefined` с остальными значениями: вывод отличается ' +
      'только содержимым коробки. Пустоту создают `Nothing()`, `zero()` и `safe`.',
    stageCaption: 'значение → of → контейнер',
    controls: [
      {
        id: 'value',
        label: 'значение',
        type: 'select',
        value: 'num',
        options: [
          { value: 'num', label: '42' },
          { value: 'nul', label: 'null' },
          { value: 'undef', label: 'undefined' },
          { value: 'zero', label: '0' },
          { value: 'str', label: "'null' — строка" }
        ]
      },
      {
        id: 'box',
        label: 'контейнер',
        type: 'select',
        value: 'Maybe',
        options: [
          { value: 'Maybe', label: 'Maybe' },
          { value: 'Either', label: 'Either' },
          { value: 'Result', label: 'Result' }
        ]
      }
    ],
    run: function (state, crocks) {
      var value = OF_VALUES[state.value]
      var Box = crocks[state.box]
      var wrapped = Box.of(value.js)
      var prefix = OF_PREFIX[state.box]
      var trap = value.js === null || value.js === undefined

      return {
        view: {
          box: state.box,
          input: value.code,
          value: wrapped.toString(),
          trap: trap,
          text: trap
            ? '`of` не проверяет значение: получился `' + wrapped.toString() +
              '`. «Отсутствие» создаётся отдельно — `Maybe.Nothing()`, ' +
              '`Maybe.zero()` или `safe`.'
            : 'Значение внутри есть всегда: контекст минимальный, проверок нет.'
        },
        steps: [
          {
            code: state.box + '.of(' + value.code + ')',
            value: wrapped.toString(),
            expect: prefix + value.text
          },
          {
            code: state.box + '.of(null)',
            value: Box.of(null).toString(),
            expect: prefix + 'null',
            note: 'тот же `of`, другое значение — вывод меняется только внутри'
          },
          {
            code: 'Maybe.zero()',
            value: crocks.Maybe.zero().toString(),
            expect: 'Nothing',
            note: 'пустоту создаёт не `of`, а `zero` / `Nothing` / `safe`'
          },
          {
            code: 'safe(x => x > 0, -1)',
            value: crocks.safe(function (x) { return x > 0 }, -1).toString(),
            expect: 'Nothing',
            note: '`safe` — это `of` с проверкой: не прошло → `Nothing`'
          }
        ]
      }
    },
    draw: function (view, stage, k) {
      stage.appendChild(
        k.flow([
          k.box({ label: 'значение', value: view.input }),
          k.arrow('of'),
          k.box({
            label: view.box,
            value: view.value,
            sub: 'минимальный контекст',
            tone: view.trap ? 'warn' : 'ok',
            code: true
          })
        ])
      )

      stage.appendChild(k.note(view.text, view.trap ? 'warn' : 'ok'))
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена 2. `map` — функция внутри коробки (раздел 2)                 */
  /* ------------------------------------------------------------------ */

  var toUpper = function (s) { return s.toUpperCase() }

  var MAP_TARGETS = {
    just: {
      code: 'Just(5)',
      fn: 'x => x * 2',
      apply: function (x) { return x * 2 },
      build: function (crocks) { return crocks.Maybe.Just(5) },
      expect: 'Just 10',
      tone: 'ok',
      text: 'значение одно: `map` применил функцию и сохранил форму контейнера'
    },
    nothing: {
      code: 'Nothing()',
      fn: 'x => x * 2',
      apply: function (x) { return x * 2 },
      build: function (crocks) { return crocks.Maybe.Nothing() },
      expect: 'Nothing',
      tone: 'warn',
      text: 'значения нет — функция даже не вызвалась, а форма осталась прежней'
    },
    right: {
      code: "Right('ivan')",
      fn: 'toUpper',
      apply: toUpper,
      build: function (crocks) { return crocks.Either.Right('ivan') },
      expect: 'Right "IVAN"',
      tone: 'ok',
      text: '`Right` — «успех»: функция применена к значению внутри'
    },
    left: {
      code: "Left('err')",
      fn: 'toUpper',
      apply: toUpper,
      build: function (crocks) { return crocks.Either.Left('err') },
      expect: 'Left "err"',
      tone: 'warn',
      text: '`Left` — уже ошибка: `map` её не трогает, ошибка проносится дальше'
    },
    pair: {
      code: "Pair('log', 5)",
      fn: 'x => x * 10',
      apply: function (x) { return x * 10 },
      build: function (crocks) { return crocks.Pair('log', 5) },
      expect: 'Pair( "log", 50 )',
      tone: 'ok',
      text: 'у `Pair` `map` меняет только второй компонент: первый — контекст (лог)'
    }
  }

  var sceneMap = {
    id: 'map',
    kicker: 'сцена 2 · раздел 2',
    title: '`map` — функция внутри коробки',
    idea:
      '`map :: (a -> b) -> f a -> f b` применяет **обычную** функцию к значению ' +
      'внутри и возвращает контейнер той же формы. `Nothing` и `Left` — это тоже ' +
      'форма: `map` их сохраняет, а функцию не вызывает.',
    hint:
      'Переключи `map` на `chain` в правом контроле: если функция сама возвращает ' +
      'контейнер, `map` оставит лишний слой (`Just Just 6`), а `chain` — нет.',
    stageCaption: 'коробка → функция внутри → коробка той же формы',
    controls: [
      {
        id: 'target',
        label: 'контейнер',
        type: 'select',
        value: 'just',
        options: [
          { value: 'just', label: 'Just(5)' },
          { value: 'nothing', label: 'Nothing()' },
          { value: 'right', label: "Right('ivan')" },
          { value: 'left', label: "Left('err')" },
          { value: 'pair', label: "Pair('log', 5)" }
        ]
      },
      {
        id: 'nest',
        label: 'функция возвращает контейнер?',
        type: 'chips',
        value: 'map',
        options: [
          { value: 'map', label: 'map' },
          { value: 'chain', label: 'chain' }
        ]
      }
    ],
    run: function (state, crocks) {
      var target = MAP_TARGETS[state.target]
      var m = target.build(crocks)
      var mapped = m.map(target.apply)

      var justFive = crocks.Maybe.Just(5)
      var nestStep = state.nest === 'chain'
        ? {
            code: 'Just(5).chain(x => Just(x + 1))',
            value: justFive
              .chain(function (x) { return crocks.Maybe.Just(x + 1) })
              .toString(),
            expect: 'Just 6',
            note: '`chain` применил функцию и снял один слой — вложенности нет'
          }
        : {
            code: 'Just(5).map(x => Just(x + 1))',
            value: justFive
              .map(function (x) { return crocks.Maybe.Just(x + 1) })
              .toString(),
            expect: 'Just Just 6',
            note: '`map` не «сплющивает»: в коробке оказалась ещё одна коробка'
          }

      var trap = ''
      try {
        justFive.chain(function (x) { return x + 1 })
      } catch (error) {
        trap = error.name + ': ' + error.message
      }

      return {
        view: {
          code: target.code,
          fn: target.fn,
          result: mapped.toString(),
          tone: target.tone,
          text: target.text,
          nest: state.nest,
          nestValue: nestStep.value
        },
        steps: [
          {
            code: target.code + '.map(' + target.fn + ')',
            value: mapped.toString(),
            expect: target.expect
          },
          {
            code: target.code + '.map(identity).equals(' + target.code + ')',
            value: String(m.map(crocks.identity).equals(m)),
            expect: 'true',
            note: 'закон тождества: бесполезный `map` можно убрать'
          },
          nestStep,
          {
            code: 'Just(5).chain(x => x + 1)',
            value: trap || '(без ошибки)',
            expect: 'TypeError: Maybe.chain: Function must return a Maybe',
            note: '`chain` ждёт контейнер, а не голое значение; для голого — `map`'
          }
        ]
      }
    },
    draw: function (view, stage, k) {
      stage.appendChild(
        k.flow([
          k.box({ label: 'было', value: view.code }),
          k.arrow(view.fn),
          k.box({ label: 'map', value: view.result, tone: view.tone, code: true })
        ])
      )

      stage.appendChild(k.note(view.text, view.tone === 'warn' ? 'warn' : 'ok'))

      if (view.nest === 'map') {
        stage.appendChild(
          k.flow([
            k.box({
              label: 'map вернул контейнер',
              value: 'Just',
              nest: true,
              inner: { label: 'второй слой', value: 'Just 6', tone: 'warn' },
              tone: 'warn'
            }),
            k.arrow('лишний слой'),
            k.box({
              label: 'результат',
              value: view.nestValue,
              tone: 'warn',
              code: true
            })
          ])
        )
      } else {
        stage.appendChild(
          k.flow([
            k.box({
              label: 'chain вернул контейнер',
              value: view.nestValue,
              sub: 'один слой — вложенности нет',
              tone: 'ok',
              code: true
            })
          ])
        )
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена 3. Законы: две дорожки сходятся (разделы 2–4)                */
  /* ------------------------------------------------------------------ */

  var sceneLaws = {
    id: 'laws',
    kicker: 'сцена 3 · разделы 2–4',
    title: 'Законы: две записи одного и того же',
    idea:
      'Законы — это гарантии для рефакторинга: если запись слева равна записи ' +
      'справа, код можно переписать и поведение не изменится. Переключай уровень: ' +
      'у функтора 2 закона, у аппликатива 4, у монады 3.',
    hint:
      'Двигай значение: при `0` цепочка монады коротко замкнётся на `Nothing`, но ' +
      'равенство всё равно останется `true` — законы не зависят от удачи значения.',
    stageCaption: 'две дорожки — один результат',
    controls: [
      {
        id: 'level',
        label: 'уровень интерфейса',
        type: 'chips',
        value: 'functor',
        options: [
          { value: 'functor', label: 'функтор' },
          { value: 'applicative', label: 'аппликатив' },
          { value: 'monad', label: 'монада' }
        ]
      },
      {
        id: 'value',
        label: 'значение внутри Just',
        type: 'range',
        min: 0,
        max: 10,
        step: 1,
        value: 5,
        samples: [0, 5, 10]
      }
    ],
    run: function (state, crocks) {
      var n = Number(state.value)
      var Maybe = crocks.Maybe
      var Just = Maybe.Just
      var Nothing = Maybe.Nothing
      var identity = crocks.identity
      var compose = crocks.compose

      var m = Just(n)
      var f = function (x) { return x + 1 }
      var g = function (x) { return x * 10 }
      var mf = function (x) { return x > 0 ? Just(x * 2) : Nothing() }
      var mg = function (x) { return x < 100 ? Just(x + 1) : Nothing() }

      if (state.level === 'applicative') {
        var u = Just(function (x) { return x * 2 })
        var v = Just(n)
        var compose3 = function (fn) {
          return function (gn) {
            return function (x) { return fn(gn(x)) }
          }
        }
        var composition = Maybe.of(compose3).ap(u).ap(Just(g)).ap(v)
          .equals(u.ap(Just(g).ap(v)))

        return {
          view: {
            tracks: [
              { label: 'Maybe.of(identity).ap(m)', value: Maybe.of(identity).ap(m).toString() },
              { label: 'm', value: m.toString() }
            ],
            verdict:
              '`of` нейтрален: обернуть и сразу применить — то же самое, что не оборачивать. ' +
              'Остальные три закона — про то, что порядок независимых коробок не важен.'
          },
          steps: [
            {
              code: 'Maybe.of(identity).ap(m).equals(m)',
              value: String(Maybe.of(identity).ap(m).equals(m)),
              expect: 'true',
              note: 'тождество'
            },
            {
              code: 'Maybe.of(f).ap(Just(' + n + ')).equals(Just(f(' + n + ')))',
              value: String(Maybe.of(f).ap(Just(n)).equals(Just(f(n)))),
              expect: 'true',
              note: 'гомоморфизм: of(f) над of(x) — это of(f(x))'
            },
            {
              code: 'u.ap(Just(' + n + ')).equals(Maybe.of(fn => fn(' + n + ')).ap(u))',
              value: String(
                u.ap(Just(n)).equals(Maybe.of(function (fn) { return fn(n) }).ap(u))
              ),
              expect: 'true',
              note: 'перестановка: функцию и значение можно поменять местами'
            },
            {
              code: 'Maybe.of(compose3).ap(u).ap(Just(g)).ap(v).equals(u.ap(Just(g).ap(v)))',
              value: String(composition),
              expect: 'true',
              note: 'композиция: три коробки в любом порядке группировки'
            }
          ]
        }
      }

      if (state.level === 'functor') {
        return {
          view: {
            tracks: [
              { label: 'm.map(compose(f, g))', value: m.map(compose(f, g)).toString() },
              { label: 'm.map(g).map(f)', value: m.map(g).map(f).toString() }
            ],
            verdict:
              'Два `map` сливаются в один — и наоборот, длинную функцию можно разбить ' +
              'на читаемые шаги, не меняя результат.'
          },
          steps: [
            {
              code: 'm.map(identity).equals(m)',
              value: String(m.map(identity).equals(m)),
              expect: 'true',
              note: 'тождество: бесполезный `map` убираем'
            },
            {
              code: 'm.map(compose(f, g)).equals(m.map(g).map(f))',
              value: String(m.map(compose(f, g)).equals(m.map(g).map(f))),
              expect: 'true',
              note: 'композиция: `compose(f, g)` — это «сначала g, затем f»'
            },
            {
              code: 'm.map(g)',
              value: m.map(g).toString(),
              expect: 'Just ' + (n * 10)
            },
            {
              code: 'm.map(g).map(f)',
              value: m.map(g).map(f).toString(),
              expect: 'Just ' + (n * 10 + 1)
            },
            {
              code: 'm.map(compose(f, g))',
              value: m.map(compose(f, g)).toString(),
              expect: 'Just ' + (n * 10 + 1)
            }
          ]
        }
      }

      var stepOne = m.chain(mf)
      var stepTwo = stepOne.chain(mg)
      var grouped = m.chain(function (x) { return mf(x).chain(mg) })

      return {
        view: {
          tracks: [
            { label: 'm.chain(f).chain(g)', value: stepTwo.toString() },
            { label: 'm.chain(x => f(x).chain(g))', value: grouped.toString() }
          ],
          verdict: n > 0
            ? 'Цепочку `chain` можно группировать как угодно: длинную цепочку — ' +
              'разбить на функции и склеить обратно.'
            : 'При `0` первый шаг вернул `Nothing`: оба пути коротко замкнулись, ' +
              'и равенство всё равно `true`.'
        },
        steps: [
          {
            code: 'Just(' + n + ').chain(f).equals(f(' + n + '))',
            value: String(m.chain(mf).equals(mf(n))),
            expect: 'true',
            note: 'левая идентичность: `of` нейтрален на входе'
          },
          {
            code: 'Just(' + n + ').chain(Just).equals(Just(' + n + '))',
            value: String(m.chain(Just).equals(Just(n))),
            expect: 'true',
            note: 'правая идентичность: `chain(of)` ничего не меняет'
          },
          {
            code: 'Just(' + n + ').chain(f).chain(g).equals(Just(' + n + ').chain(x => f(x).chain(g)))',
            value: String(stepTwo.equals(grouped)),
            expect: 'true',
            note: 'ассоциативность: группировка цепочки не важна'
          },
          {
            code: 'Just(' + n + ').chain(f)',
            value: stepOne.toString(),
            expect: n > 0 ? 'Just ' + (n * 2) : 'Nothing'
          },
          {
            code: 'Just(' + n + ').chain(f).chain(g)',
            value: stepTwo.toString(),
            expect: n > 0 ? 'Just ' + (n * 2 + 1) : 'Nothing'
          }
        ]
      }
    },
    draw: function (view, stage, k) {
      stage.appendChild(
        k.flow([
          k.box({
            label: view.tracks[0].label,
            value: view.tracks[0].value,
            tone: 'accent',
            code: true
          }),
          k.el('span', 'veq', '≡'),
          k.box({
            label: view.tracks[1].label,
            value: view.tracks[1].value,
            tone: 'accent',
            code: true
          })
        ])
      )

      stage.appendChild(k.note(view.verdict, 'ok'))
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена 4. `ap` / `liftA2` — независимые коробки (раздел 3)          */
  /* ------------------------------------------------------------------ */

  var sceneAp = {
    id: 'ap',
    kicker: 'сцена 4 · раздел 3',
    title: 'Аппликатив: независимые коробки',
    idea:
      '`liftA2` комбинирует **независимые** значения: имя и возраст проверяются ' +
      'отдельно друг от друга. Поэтому `Result` собирает **все** ошибки сразу, ' +
      'а `Either` останавливается на первой.',
    hint:
      'Оставь оба поля невалидными и переключи движок: `Result` покажет две ошибки, ' +
      '`Either` — только первую. Это не про «ум», а про `ap` конкретной библиотеки.',
    stageCaption: 'две независимые проверки → одна коробка',
    controls: [
      {
        id: 'name',
        label: 'поле «имя»',
        type: 'select',
        value: 'valid',
        options: [
          { value: 'valid', label: "'  Ivan  ' — валидное" },
          { value: 'empty', label: "'   ' — пустое" }
        ]
      },
      {
        id: 'age',
        label: 'поле «возраст»',
        type: 'select',
        value: '21',
        options: [
          { value: '21', label: '21 — проходит 18+' },
          { value: '17', label: '17 — не проходит' }
        ]
      },
      {
        id: 'engine',
        label: 'движок ошибок',
        type: 'chips',
        value: 'Result',
        options: [
          { value: 'Result', label: 'Result · копит' },
          { value: 'Either', label: 'Either · первая' }
        ]
      }
    ],
    run: function (state, crocks) {
      var isResult = state.engine === 'Result'
      var ok = isResult ? crocks.Result.Ok : crocks.Either.Right
      var err = isResult
        ? function (message) { return crocks.Result.Err([message]) }
        : function (message) { return crocks.Either.Left(message) }

      var rawName = state.name === 'empty' ? '   ' : '  Ivan  '
      var age = Number(state.age)

      var validateName = function (value) {
        return value.trim() ? ok(value.trim()) : err('имя пустое')
      }
      var validateAge = function (value) {
        return value >= 18 ? ok(value) : err('нужен 18+')
      }
      var makeUser = crocks.curry(function (name, years) {
        return { name: name, age: years }
      })

      var nameBox = validateName(rawName)
      var ageBox = validateAge(age)
      var combined = crocks.liftA2(makeUser, nameBox, ageBox)

      var errors = []
      if (state.name === 'empty') errors.push('имя пустое')
      if (age < 18) errors.push('нужен 18+')

      var nameExpect = state.name === 'empty'
        ? (isResult ? 'Err [ "имя пустое" ]' : 'Left "имя пустое"')
        : (isResult ? 'Ok "Ivan"' : 'Right "Ivan"')

      var ageExpect = age >= 18
        ? (isResult ? 'Ok ' + age : 'Right ' + age)
        : (isResult ? 'Err [ "нужен 18+" ]' : 'Left "нужен 18+"')

      var expected
      if (!errors.length) {
        expected = (isResult ? 'Ok ' : 'Right ') +
          '{ name: "Ivan", age: ' + age + ' }'
      } else if (isResult) {
        expected = errList(errors)
      } else {
        expected = 'Left ' + q(errors[0])
      }

      var engineName = isResult ? 'Result' : 'Either'
      var bothFailed = errors.length === 2

      return {
        view: {
          engine: engineName,
          sources: [
            {
              label: 'имя',
              input: q(rawName),
              result: nameBox.toString(),
              failed: state.name === 'empty'
            },
            {
              label: 'возраст',
              input: String(age),
              result: ageBox.toString(),
              failed: age < 18
            }
          ],
          combined: combined.toString(),
          ok: !errors.length,
          text: !errors.length
            ? 'Обе проверки прошли независимо друг от друга — `liftA2` собрал из них объект.'
            : bothFailed && isResult
              ? 'Обе проверки провалились **независимо**, и `Result.ap` собрал обе ошибки: ' +
                errors.map(function (item) { return '«' + item + '»' }).join(', ') + '.'
              : bothFailed
                ? 'Проверки провалились обе, но `Either.ap` вернул только первую ошибку: ' +
                  '«' + errors[0] + '». Копить ошибки — работа `Result` со списком в `Err`.'
                : 'Одна проверка провалилась — `liftA2` вернул ошибку, но второе поле всё равно было проверено.'
        },
        steps: [
          {
            code: 'validateName(' + q(rawName) + ')',
            value: nameBox.toString(),
            expect: nameExpect
          },
          {
            code: 'validateAge(' + age + ')',
            value: ageBox.toString(),
            expect: ageExpect
          },
          {
            code: 'liftA2(makeUser, имя, возраст)',
            value: combined.toString(),
            expect: expected,
            note: 'то же самое: `Result.of(makeUser).ap(имя).ap(возраст)`'
          },
          {
            code: "Result.of(makeUser).ap(Err(['a'])).ap(Err(['b']))",
            value: crocks.Result.of(makeUser)
              .ap(crocks.Result.Err(['a']))
              .ap(crocks.Result.Err(['b']))
              .toString(),
            expect: 'Err [ "a", "b" ]',
            note: '`Result` копит ошибки'
          },
          {
            code: "Either.of(makeUser).ap(Left('a')).ap(Left('b'))",
            value: crocks.Either.of(makeUser)
              .ap(crocks.Either.Left('a'))
              .ap(crocks.Either.Left('b'))
              .toString(),
            expect: 'Left "a"',
            note: '`Either` отдаёт первую ошибку и дальше не идёт'
          }
        ]
      }
    },
    draw: function (view, stage, k) {
      var sources = view.sources.map(function (source) {
        return k.box({
          label: 'проверка: ' + source.label,
          value: source.result,
          sub: 'вход ' + source.input,
          tone: source.failed ? 'fail' : 'ok'
        })
      })

      stage.appendChild(
        k.flow([
          k.stack(sources),
          k.arrow('liftA2(makeUser)'),
          k.box({
            label: view.engine,
            value: view.combined,
            tone: view.ok ? 'ok' : 'fail',
            code: true
          })
        ])
      )

      stage.appendChild(k.note(view.text, view.ok ? 'ok' : 'warn'))
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена 5. `chain` — конвейер зависимых шагов (раздел 4)             */
  /* ------------------------------------------------------------------ */

  var sceneChain = {
    id: 'chain',
    kicker: 'сцена 5 · раздел 4',
    title: 'Монада: `chain` сплющивает слой',
    idea:
      'Когда следующий шаг **зависит** от значения и сам возвращает контейнер, нужен ' +
      '`chain`: он применяет функцию и снимает лишний слой. Сбой на шаге — и все ' +
      'следующие шаги не вызываются.',
    hint:
      'Переключи первый шаг с `chain` на `map`: результат тот же по смыслу, но ' +
      'значение окажется завёрнутым дважды — `Just Just 4`.',
    stageCaption: 'конвейер: каждый шаг зависит от предыдущего',
    controls: [
      {
        id: 'n',
        label: 'стартовое значение',
        type: 'select',
        value: '8',
        options: [
          { value: '8', label: 'Just(8) — чётное' },
          { value: '12', label: 'Just(12) — чётное' },
          { value: '7', label: 'Just(7) — нечётное' }
        ]
      },
      {
        id: 'combine',
        label: 'первый шаг через',
        type: 'chips',
        value: 'chain',
        options: [
          { value: 'chain', label: 'chain' },
          { value: 'map', label: 'map' }
        ]
      }
    ],
    run: function (state, crocks) {
      var Maybe = crocks.Maybe
      var Just = Maybe.Just
      var Nothing = Maybe.Nothing

      var n = Number(state.n)
      var even = n % 2 === 0
      var half = function (x) { return x % 2 === 0 ? Just(x / 2) : Nothing() }
      var addTen = function (x) { return Just(x + 10) }

      var start = Just(n)
      var byMap = start.map(half)
      var byChain = start.chain(half)
      var pipeline = start.chain(half).chain(addTen)

      var mapExpect = even ? 'Just Just ' + (n / 2) : 'Just Nothing'
      var chainExpect = even ? 'Just ' + (n / 2) : 'Nothing'
      var pipelineExpect = even ? 'Just ' + (n / 2 + 10) : 'Nothing'

      return {
        view: {
          start: 'Just ' + n,
          even: even,
          combine: state.combine,
          half: chainExpect,
          nested: state.combine === 'map'
            ? { outer: 'Just', inner: even ? 'Just ' + (n / 2) : 'Nothing' }
            : null,
          nestedValue: mapExpect,
          pipeline: pipelineExpect,
          text: !even
            ? state.combine === 'chain'
              ? '`half` вернул `Nothing`: число нечётное. `addTen` не вызвался — ' +
                'контекст «сбой» проносится дальше сам.'
              : '`half` вернул `Nothing`, а `map` завернул его в `Just` — получилось ' +
                '`Just Nothing`. Ещё одна причина брать `chain` для шагов с контейнером.'
            : state.combine === 'chain'
              ? '`chain` вернул `' + chainExpect + '`: один слой, как и был. ' +
                'Шаг `addTen` получил число и добавил 10.'
              : '`map` вернул `' + mapExpect + '`: значение завёрнуто дважды — ' +
                'следующий шаг получил бы коробку в коробке.'
        },
        steps: [
          {
            code: 'Just(' + n + ').map(half)',
            value: byMap.toString(),
            expect: mapExpect,
            note: '`map` не снимает слой, даже если функция вернула контейнер'
          },
          {
            code: 'Just(' + n + ').chain(half)',
            value: byChain.toString(),
            expect: chainExpect,
            note: '`chain` применил функцию и снял один слой'
          },
          {
            code: 'Just(' + n + ').chain(half).chain(addTen)',
            value: pipeline.toString(),
            expect: pipelineExpect
          },
          {
            code: 'Nothing().chain(half)',
            value: Nothing().chain(half).toString(),
            expect: 'Nothing',
            note: 'сбой не «продолжается»: функция не вызывается'
          }
        ]
      }
    },
    draw: function (view, stage, k) {
      var pipeline = [
        k.box({ label: 'старт', value: view.start, tone: 'accent' }),
        k.arrow('half')
      ]

      if (view.nested) {
        pipeline.push(
          k.box({
            label: 'map: лишний слой',
            value: view.nested.outer,
            nest: true,
            inner: { label: 'коробка в коробке', value: view.nested.inner, tone: 'warn' },
            tone: 'warn'
          })
        )
      } else {
        pipeline.push(
          k.box({
            label: 'после half',
            value: view.half,
            tone: view.even ? 'ok' : 'fail',
            code: true
          })
        )
      }

      pipeline.push(k.arrow('addTen'))
      pipeline.push(
        view.even
          ? k.box({
              label: 'после addTen',
              value: view.pipeline,
              tone: 'ok',
              code: true
            })
          : k.box({
              label: 'addTen',
              value: 'не вызван',
              tone: 'ghost',
              code: true,
              animate: false
            })
      )

      stage.appendChild(k.flow(pipeline))
      stage.appendChild(k.note(view.text, view.even ? 'ok' : 'warn'))
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена 6. Иерархия интерфейсов и предикаты (раздел 5)               */
  /* ------------------------------------------------------------------ */

  var HIERARCHY_LEVELS = [
    { key: 'functor', name: 'Functor', ops: 'map' },
    { key: 'applicative', name: 'Applicative', ops: 'map + of + ap' },
    { key: 'monad', name: 'Monad', ops: 'map + of + ap + chain' }
  ]

  var HIERARCHY_TYPES = {
    maybe: {
      label: 'Maybe',
      code: 'Maybe.of(1)',
      build: function (crocks) { return crocks.Maybe.of(1) },
      expect: {
        functor: true, apply: true, applicative: true,
        chain: true, monad: true, monoid: false
      },
      verdict: 'есть все четыре операции — значит, и все три интерфейса сразу'
    },
    either: {
      label: 'Either',
      code: 'Either.of(1)',
      build: function (crocks) { return crocks.Either.of(1) },
      expect: {
        functor: true, apply: true, applicative: true,
        chain: true, monad: true, monoid: false
      },
      verdict: 'тот же набор, что у `Maybe`: ошибка — это просто другой контекст'
    },
    pair: {
      label: 'Pair',
      code: "Pair(['log'], 1)",
      build: function (crocks) { return crocks.Pair(['log'], 1) },
      expect: {
        functor: true, apply: true, applicative: false,
        chain: true, monad: false, monoid: false
      },
      verdict:
        '`map`/`ap`/`chain` есть, а `of` нет — поэтому `isApplicative` и `isMonad` ' +
        'дают `false`: предикат требует `of`, даже если операции работают'
    },
    tuple: {
      label: 'Tuple',
      code: 'Tuple(3)(2, 1, 2)',
      build: function (crocks) { return crocks.Tuple(3)(2, 1, 2) },
      expect: {
        functor: true, apply: false, applicative: false,
        chain: false, monad: false, monoid: false
      },
      verdict: 'только функтор: `map` меняет последний компонент, `of` нет'
    },
    pred: {
      label: 'Pred',
      code: 'Pred(x => x > 0)',
      build: function (crocks) { return crocks.Pred(function (x) { return x > 0 }) },
      expect: {
        functor: false, apply: false, applicative: false,
        chain: false, monad: false, monoid: true
      },
      verdict:
        'функтор? нет: он **потребляет** значение, поэтому у него `contramap`, ' +
        'а `map` нет. При этом `Pred` — моноид'
    },
    sum: {
      label: 'Sum',
      code: 'Sum(1)',
      build: function (crocks) { return crocks.Sum(1) },
      expect: {
        functor: false, apply: false, applicative: false,
        chain: false, monad: false, monoid: true
      },
      verdict: 'моноид, а не функтор: складывается через `concat`, значения не «внутри»'
    },
    const: {
      label: 'Const',
      code: "Const(String)('log')",
      build: function (crocks) { return crocks.Const(String)('log') },
      expect: {
        functor: true, apply: true, applicative: true,
        chain: false, monad: false, monoid: true
      },
      verdict:
        'функтор-сток: `map` есть, но он ничего не меняет; `chain` нет — ' +
        'аккумулятор только накапливается'
    }
  }

  var PREDICATES = [
    { key: 'functor', name: 'isFunctor' },
    { key: 'apply', name: 'isApply' },
    { key: 'applicative', name: 'isApplicative' },
    { key: 'chain', name: 'isChain' },
    { key: 'monad', name: 'isMonad' },
    { key: 'monoid', name: 'isMonoid' }
  ]

  var sceneHierarchy = {
    id: 'hierarchy',
    kicker: 'сцена 6 · раздел 5',
    title: 'Иерархия интерфейсов и предикаты',
    idea:
      'Интерфейсы вложены друг в друга: функтор → аппликатив → монада, каждый ' +
      'следующий добавляет операцию. Предикаты crocks проверяют не название типа, ' +
      'а набор операций — по цепочке.',
    hint:
      'Кортеж создаётся в два шага: `const T3 = Tuple(3); T3(2, 1, 2)` — `Tuple(3)` ' +
      'возвращает конструктор нужной арности.',
    stageCaption: 'что подтверждают предикаты crocks',
    controls: [
      {
        id: 'type',
        label: 'тип-значение',
        type: 'chips',
        value: 'maybe',
        options: Object.keys(HIERARCHY_TYPES).map(function (key) {
          return { value: key, label: HIERARCHY_TYPES[key].label }
        })
      }
    ],
    run: function (state, crocks) {
      var type = HIERARCHY_TYPES[state.type]
      var value = type.build(crocks)

      var flags = {
        functor: crocks.isFunctor(value),
        apply: crocks.isApply(value),
        applicative: crocks.isApplicative(value),
        chain: crocks.isChain(value),
        monad: crocks.isMonad(value),
        monoid: crocks.isMonoid(value)
      }

      return {
        view: {
          label: type.label,
          code: type.code,
          verdict: type.verdict,
          levels: HIERARCHY_LEVELS.map(function (level) {
            return { name: level.name, ops: level.ops, on: flags[level.key] }
          }),
          operations: [
            { name: 'map', on: flags.functor, from: 'isFunctor' },
            { name: 'of', on: flags.applicative, from: 'isApplicative' },
            { name: 'ap', on: flags.apply, from: 'isApply' },
            { name: 'chain', on: flags.chain, from: 'isChain' }
          ]
        },
        steps: PREDICATES.map(function (predicate) {
          return {
            code: predicate.name + '(' + type.code + ')',
            value: String(flags[predicate.key]),
            expect: String(type.expect[predicate.key])
          }
        })
      }
    },
    draw: function (view, stage, k) {
      var levels = k.el('div', 'levels')

      view.levels.forEach(function (level) {
        var row = k.el('div', 'level' + (level.on ? ' level--on' : ''))
        var head = k.el('div', 'level__head')
        head.appendChild(k.el('span', 'level__name', level.name))
        head.appendChild(k.el('span', 'level__ops', level.ops))
        head.appendChild(k.el('span', 'level__mark', level.on ? '✓' : '✗'))
        row.appendChild(head)
        levels.appendChild(row)
      })

      var table = k.el('table', 'flags')
      var thead = k.el('thead')
      var headRow = k.el('tr')
      headRow.appendChild(k.el('th', null, 'операция'))
      headRow.appendChild(k.el('th', null, 'есть?'))
      headRow.appendChild(k.el('th', null, 'кто спрашивает'))
      thead.appendChild(headRow)
      table.appendChild(thead)

      var tbody = k.el('tbody')
      view.operations.forEach(function (operation) {
        var row = k.el('tr')
        row.appendChild(k.el('td', null, operation.name))
        row.appendChild(
          k.el('td', operation.on ? 'on' : 'off', operation.on ? '✔' : '✘')
        )
        row.appendChild(k.el('td', null, operation.from))
        tbody.appendChild(row)
      })
      table.appendChild(tbody)

      stage.appendChild(
        k.flow([
          levels,
          k.stack([
            k.box({
              label: 'тип',
              value: view.label,
              sub: view.code,
              tone: 'accent',
              code: true
            }),
            table
          ])
        ], 'vflow--top')
      )

      stage.appendChild(
        k.note('**' + view.label + '**: ' + view.verdict, view.levels[2].on ? 'ok' : 'warn')
      )
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена 7. Вариативность: map / contramap / promap (раздел 2)        */
  /* ------------------------------------------------------------------ */

  var sceneVariance = {
    id: 'variance',
    kicker: 'сцена 7 · раздел 2',
    title: 'Вариативность: `map`, `contramap`, `promap`',
    idea:
      'У параметра типа есть **направление**. Значение на выходе → `map` ' +
      '(ковариантно). Значение на входе → `contramap` (контравариантно: функция ' +
      'идёт назад). И вход, и выход → `promap` (профунктор).',
    hint:
      'Для `promap` вводи число строкой: `Number("3")` → 3, дальше `+1` и `×10`. ' +
      'На нечисле получится `NaN` — это честный ответ: вход адаптирован, но не подошёл.',
    stageCaption: 'куда смотрит функция',
    controls: [
      {
        id: 'mode',
        label: 'интерфейс',
        type: 'chips',
        value: 'covariant',
        options: [
          { value: 'covariant', label: 'ковариантный' },
          { value: 'contravariant', label: 'контравариантный' },
          { value: 'profunctor', label: 'профунктор' }
        ]
      },
      {
        id: 'input',
        label: 'вход для проверки',
        type: 'text',
        value: 'abc',
        placeholder: 'abc',
        wide: true,
        samples: ['abc', '', '3']
      }
    ],
    run: function (state, crocks) {
      var input = state.input

      var positive = crocks.Pred(function (x) { return x > 0 })
      var nonEmpty = positive.contramap(function (s) { return s.length })
      var inc = crocks.Arrow(function (x) { return x + 1 })
      var fromString = inc.promap(
        function (s) { return Number(s) },
        function (n) { return n * 10 }
      )

      var mapped = crocks.Maybe.Just(2).map(function (x) { return x * 2 })
      var contravariant = nonEmpty.runWith(input)
      var profunctor = fromString.runWith(input)

      return {
        view: {
          mode: state.mode,
          text: state.mode === 'covariant'
            ? 'Функция применяется к значению **внутри** и контейнер идёт в ту же сторону: `F a → F b`.'
            : state.mode === 'contravariant'
              ? 'Значение стоит **на входе**, поэтому функция идёт назад: `b → a`, а контейнер — `F a → F b`.'
              : 'Тип `P a b` держит и вход, и выход: `promap` меняет оба конца независимо.',
          lanes: [
            {
              key: 'covariant',
              title: 'ковариантный',
              io: 'F a → F b · функция a → b',
              arrow: 'map: a → b',
              back: false,
              input: 'Just 2',
              output: mapped.toString()
            },
            {
              key: 'contravariant',
              title: 'контравариантный',
              io: 'F a → F b · функция b → a',
              arrow: 'contramap: b → a',
              back: true,
              input: q(input),
              output: String(contravariant)
            },
            {
              key: 'profunctor',
              title: 'профунктор',
              io: 'P a b → P c d · оба конца',
              arrow: 'promap: c → a, b → d',
              back: false,
              input: q(input),
              output: String(profunctor)
            }
          ]
        },
        steps: [
          {
            code: 'Just(2).map(x => x * 2)',
            value: mapped.toString(),
            expect: 'Just 4',
            note: 'ковариантно: контейнер меняется в сторону значения'
          },
          {
            code: 'inc.map(n => n * 2).runWith(5)',
            value: String(inc.map(function (n) { return n * 2 }).runWith(5)),
            expect: '12',
            note: '`map` подменил выход стрелки: `(5 + 1) * 2`'
          },
          {
            code: 'nonEmpty.runWith(' + q(input) + ')',
            value: String(contravariant),
            expect: String(input.length > 0),
            note: '`contramap(s => s.length)` сначала превратил строку в число'
          },
          {
            code: "inc.contramap(s => Number(s)).runWith('3')",
            value: String(inc.contramap(function (s) { return Number(s) }).runWith('3')),
            expect: '4',
            note: '`contramap` подменил вход: `Number("3") + 1`'
          },
          {
            code: 'fromString.runWith(' + q(input) + ')',
            value: String(profunctor),
            expect: String((Number(input) + 1) * 10),
            note: '`promap` адаптировал и вход, и выход: `(n + 1) * 10`'
          },
          {
            code: "Const(String)('log').map(x => x * 1000)",
            value: crocks.Const(String)('log').map(function (x) { return x * 1000 }).toString(),
            expect: 'Const(String) "log"',
            note: 'крайний случай: `map` ничего не меняет — константный функтор'
          }
        ]
      }
    },
    draw: function (view, stage, k) {
      view.lanes.forEach(function (lane) {
        var row = k.el('div', 'level' + (lane.key === view.mode ? ' level--on' : ''))
        var head = k.el('div', 'level__head')
        head.appendChild(k.el('span', 'level__name', lane.title))
        head.appendChild(k.el('span', 'level__ops', lane.io))
        row.appendChild(head)

        row.appendChild(
          k.flow([
            k.box({ label: 'вход', value: lane.input }),
            k.arrow(lane.arrow, lane.back),
            k.box({
              label: 'выход',
              value: lane.output,
              tone: lane.key === view.mode ? 'ok' : undefined
            })
          ])
        )

        stage.appendChild(row)
      })

      stage.appendChild(k.note(view.text, 'ok'))
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена 8. Три операции на одной форме (раздел 6)                    */
  /* ------------------------------------------------------------------ */

  var sceneForm = {
    id: 'form',
    kicker: 'сцена 8 · раздел 6',
    title: 'Три операции на одной форме',
    idea:
      'Одна форма — три роли. `map` приводит значение внутри `Result`. `liftA2` ' +
      'комбинирует **независимые** поля и копит ошибки. `chain` выполняет ' +
      '**зависимый** шаг (загрузку) только после успешной проверки.',
    hint:
      'Введи `   ` или `Petr`: в первом случае `chain(load)` вообще не вызовется, ' +
      'во втором — вызовется и вернёт `Err`: шаг зависит от готового пользователя.',
    stageCaption: 'что делает каждая операция',
    controls: [
      {
        id: 'name',
        label: 'поле «имя»',
        type: 'text',
        value: '  Ivan  ',
        placeholder: '  Ivan  ',
        wide: true,
        samples: ['  Ivan  ', '   ', 'Petr']
      },
      {
        id: 'age',
        label: 'поле «возраст»',
        type: 'select',
        value: '21',
        options: [
          { value: '21', label: '21 — проходит' },
          { value: '17', label: '17 — не проходит' }
        ]
      }
    ],
    run: function (state, crocks) {
      var Result = crocks.Result
      var Ok = Result.Ok
      var Err = Result.Err

      var validateName = function (value) {
        return value.trim() ? Ok(value.trim()) : Err(['имя пустое'])
      }
      var validateAge = function (value) {
        return value >= 18 ? Ok(value) : Err(['нужен 18+'])
      }
      var normalizeName = function (value) {
        return validateName(value).map(function (s) {
          return s[0].toUpperCase() + s.slice(1)
        })
      }
      var makeUser = crocks.curry(function (name, years) {
        return { name: name, age: years }
      })
      var load = function (user) {
        return user.name === 'Ivan'
          ? Ok(Object.assign({}, user, { id: 1 }))
          : Err(['нет такого'])
      }

      var raw = state.name
      var age = Number(state.age)
      var normalized = normalizeName(raw)
      var ageBox = validateAge(age)
      var form = crocks.liftA2(makeUser, normalized, ageBox)
      var final = form.chain(load)

      var trimmed = raw.trim()
      var cap = trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : ''
      var errors = []
      if (!trimmed) errors.push('имя пустое')
      if (!(age >= 18)) errors.push('нужен 18+')

      var normalizedExpect = trimmed ? 'Ok ' + q(cap) : 'Err [ "имя пустое" ]'
      var ageExpect = age >= 18 ? 'Ok ' + age : 'Err [ "нужен 18+" ]'
      var formExpect = errors.length
        ? errList(errors)
        : 'Ok { name: ' + q(cap) + ', age: ' + age + ' }'
      var finalExpect = errors.length
        ? formExpect
        : cap === 'Ivan'
          ? 'Ok { name: "Ivan", age: ' + age + ', id: 1 }'
          : 'Err [ "нет такого" ]'

      var loaded = !errors.length
      var found = loaded && cap === 'Ivan'

      return {
        view: {
          lanes: [
            {
              title: 'map',
              detail: 'привести значение внутри',
              value: normalized.toString(),
              tone: trimmed ? 'ok' : 'fail'
            },
            {
              title: 'liftA2',
              detail: 'скомбинировать независимые поля',
              value: form.toString(),
              tone: errors.length ? 'fail' : 'ok'
            },
            {
              title: 'chain',
              detail: 'зависимый шаг: загрузка',
              value: final.toString(),
              tone: !loaded ? 'warn' : found ? 'ok' : 'warn'
            }
          ],
          text: !loaded
            ? 'Форма не собралась, поэтому `chain(load)` **не вызвался**: зависимый шаг ' +
              'ждёт успешную форму, а не ошибку.'
            : found
              ? 'Форма собрана, `chain` передал её в `load`, и шаг вернул пользователя с `id`.'
              : 'Форма валидна, `chain` вызвал `load`, но пользователя с таким именем нет.'
        },
        steps: [
          {
            code: 'normalizeName(' + q(raw) + ')',
            value: normalized.toString(),
            expect: normalizedExpect,
            note: '`map` внутри: `Result` остался `Ok`, изменилось только значение'
          },
          {
            code: 'validateAge(' + age + ')',
            value: ageBox.toString(),
            expect: ageExpect
          },
          {
            code: 'liftA2(makeUser, имя, возраст)',
            value: form.toString(),
            expect: formExpect,
            note: 'поля независимы — ошибки копятся'
          },
          {
            code: 'form.chain(load)',
            value: final.toString(),
            expect: finalExpect,
            note: loaded ? 'шаг зависит от готового пользователя' : 'шаг не вызвался'
          }
        ]
      }
    },
    draw: function (view, stage, k) {
      view.lanes.forEach(function (lane) {
        stage.appendChild(
          k.flow([
            k.box({
              label: lane.title,
              value: lane.value,
              sub: lane.detail,
              tone: lane.tone,
              code: true
            })
          ])
        )
      })

      stage.appendChild(
        k.note(view.text, view.lanes[1].tone === 'fail' ? 'warn' : 'ok')
      )
    }
  }

  /* ------------------------------------------------------------------ */
  /* урок целиком                                                       */
  /* ------------------------------------------------------------------ */

  var lesson = {
    id: 'lesson-0',
    title: 'Урок 0 — Термины ФП: функтор, аппликатив, монада',
    scenes: [
      sceneOf,
      sceneMap,
      sceneLaws,
      sceneAp,
      sceneChain,
      sceneHierarchy,
      sceneVariance,
      sceneForm
    ]
  }

  root.DEMO_SCENES_0 = lesson
  if (root.Demo) root.Demo.page(lesson)
})(typeof window !== 'undefined' ? window : globalThis)
