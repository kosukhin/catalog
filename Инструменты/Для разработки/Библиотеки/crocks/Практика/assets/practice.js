/* ==========================================================================
   Практика курса crocks — общий движок заданий.
   --------------------------------------------------------------------------
   Как это работает:
     • файл урока (assets/lesson-N.js) описывает задания данными и вызывает
       Practice.lesson({...});
     • этот файл рисует карточки, проверяет ответы и считает прогресс;
     • проверка ответов «что напечатает код» сверяется по реальным toString()
       из crocks, а задания «напиши код» выполняются в браузере на настоящей
       библиотеке (dist-сборка из node_modules, запасной вариант — CDN).

   Простой HTML, без сборщика: <script src="assets/practice.js"></script>
   ========================================================================== */

;(function (root) {
  'use strict'

  /* ------------------------------------------------------------------ */
  /* константы                                                          */
  /* ------------------------------------------------------------------ */

  var STORAGE_KEY = 'crocks-practice-v1'

  // Сборка для браузера кладёт библиотеку в window.crocks.
  var CROCKS_SOURCES = [
    '../node_modules/crocks/dist/crocks.min.js',
    'https://unpkg.com/crocks@0.12.4/dist/crocks.min.js'
  ]

  // Что доступно в песочнице заданий «напиши код».
  var CROCKS_NAMES = [
    'Maybe', 'Either', 'Result', 'Identity', 'Pair', 'Tuple', 'Const', 'Sum',
    'Async', 'Pred', 'Arrow', 'curry', 'compose', 'pipe', 'identity',
    'constant', 'flip', 'liftA2', 'liftA3', 'safe', 'isFunctor', 'isApply',
    'isApplicative', 'isChain', 'isMonad'
  ]

  var BADGES = {
    input: 'вывод',
    choice: 'выбор',
    code: 'код',
    matrix: 'таблица'
  }

  /* ------------------------------------------------------------------ */
  /* состояние                                                          */
  /* ------------------------------------------------------------------ */

  var lesson = null
  var tasks = []
  var cards = {} /* id -> { el, api } */
  var results = {} /* id -> { ok: boolean, answer: string } */
  var crocksPromise = null

  var supportsStorage = (function () {
    try {
      root.localStorage.setItem('__probe', '1')
      root.localStorage.removeItem('__probe')
      return true
    } catch (e) {
      return false
    }
  })()

  /* ------------------------------------------------------------------ */
  /* утилиты                                                            */
  /* ------------------------------------------------------------------ */

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text != null) node.textContent = text
    return node
  }

  // Мини-разметка для текстов заданий: `код`, **жирный**, перенос строки.
  function md(text) {
    var escaped = escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    return escaped.replace(/\n/g, '<br>')
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // Сравнение ответов «на глаз»: регистр, пробелы, кавычки и ё/е не важны.
  function normalize(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[«»"'`]/g, '')
      .replace(/\s+/g, '')
  }

  function readStorage() {
    if (!supportsStorage || !lesson) return {}
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY + ':' + lesson.id)
      return JSON.parse(raw || '{}') || {}
    } catch (e) {
      return {}
    }
  }

  function writeStorage(value) {
    if (!supportsStorage || !lesson) return
    try {
      root.localStorage.setItem(
        STORAGE_KEY + ':' + lesson.id,
        JSON.stringify(value)
      )
    } catch (e) {
      /* приватный режим — просто не сохраняем */
    }
  }

  /* ------------------------------------------------------------------ */
  /* crocks: ленивая загрузка и песочница                               */
  /* ------------------------------------------------------------------ */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = function () {
        resolve()
      }
      script.onerror = function () {
        reject(new Error('не удалось загрузить ' + src))
      }
      document.head.appendChild(script)
    })
  }

  // Пробуем локальную dist-сборку (после npm install), затем CDN.
  function loadCrocks() {
    if (root.crocks) return Promise.resolve(root.crocks)
    if (crocksPromise) return crocksPromise

    crocksPromise = CROCKS_SOURCES.reduce(function (chain, src) {
      return chain.catch(function () {
        return loadScript(src)
      })
    }, Promise.reject(new Error('нет источника')))
      .then(function () {
        return root.crocks || null
      })
      .catch(function () {
        return null
      })

    return crocksPromise
  }

  function localNames(crocks) {
    var maybe = crocks.Maybe || {}
    var either = crocks.Either || {}
    var result = crocks.Result || {}
    return [maybe.Just, maybe.Nothing, either.Left, either.Right,
      result.Ok, result.Err]
  }

  /*
    Собирает функцию-вычислитель для задания «напиши код»:
    доступны типы crocks, хелперы и предустановки задания (task.prelude).
  */
  function makeEvaluator(prelude) {
    var crocks = root.crocks
    if (!crocks) throw new Error('crocks не загружен')

    var names = CROCKS_NAMES.filter(function (name) {
      return typeof crocks[name] !== 'undefined'
    })
    var values = names.map(function (name) {
      return crocks[name]
    })
    var params = names.concat(['Just', 'Nothing', 'Left', 'Right', 'Ok', 'Err'])
    var args = values.concat(localNames(crocks))
    var header = prelude ? prelude + '\n' : ''

    return function evaluate(code) {
      var body = header + 'return (' + code + ')'
      var fn = Function.apply(null, params.concat([body]))
      return fn.apply(null, args)
    }
  }

  /* ------------------------------------------------------------------ */
  /* проверка ответов                                                   */
  /* ------------------------------------------------------------------ */

  function ok(message) {
    return { ok: true, message: message || '' }
  }

  function fail(message, actual) {
    return { ok: false, message: message, actual: actual }
  }

  // «Что напечатает код»: сравниваем нормализованные строки.
  function checkInput(task, answer) {
    if (!String(answer).trim()) {
      return { ok: false, info: 'Введи вывод консоли — например: Just 4.' }
    }

    var accepted = [task.expected].concat(task.accept || [])
    var got = normalize(answer)
    var match = accepted.some(function (variant) {
      return normalize(variant) === got
    })

    if (match) return ok()
    return fail(
      'Пока не совпадает. Ожидалось: `' +
        task.expected +
        '`' +
        (task.why ? '\n\n' + task.why : '')
    )
  }

  function checkChoice(task, answer) {
    if (!answer) {
      return { ok: false, info: 'Выбери один из вариантов.' }
    }
    if (answer === task.answer) return ok()

    var right = (task.options || []).filter(function (o) {
      return o.id === task.answer
    })[0]
    return fail(
      'Неверно. Правильный вариант: ' +
        (right ? right.short || right.label : task.answer) +
        (task.why ? '\n\n' + task.why : '')
    )
  }

  function checkMatrix(task, answer) {
    var filled = task.rows.filter(function (row) {
      return !!answer[row.id]
    })

    if (!filled.length) {
      return { ok: false, info: 'Заполни хотя бы одну строку таблицы.' }
    }

    var wrong = task.rows.filter(function (row) {
      return answer[row.id] !== row.answer
    })

    if (!wrong.length) return ok()

    return fail(
      'Верно ' + (task.rows.length - wrong.length) + ' из ' +
        task.rows.length + '. Перечитай таблицу интерфейсов в разделе 5 ' +
        'урока: предикаты в crocks добавляют требования по цепочке.',
      null
    )
  }

  /* ------------------------------------------------------------------ */
  /* рендеринг: секции, карточки, контролы                              */
  /* ------------------------------------------------------------------ */

  function elHtml(tag, className, html) {
    var node = el(tag, className)
    node.innerHTML = html
    return node
  }

  function codeBlock(code) {
    var pre = el('pre', 'code')
    pre.appendChild(el('code', null, code))
    return pre
  }

  // Код для чтения: контекст задания + строка console.log.
  function readingCode(task) {
    var parts = []
    if (task.setup) parts.push(task.setup.trim())
    parts.push('console.log(' + task.expr.trim() + ')')
    return parts.join('\n')
  }

  function controlInput(task, body) {
    var form = el('form', 'answer')
    var label = el('label', 'answer__label', 'вывод консоли →')
    var input = el('input', 'input')
    input.type = 'text'
    input.id = 'answer-' + task.id
    input.autocomplete = 'off'
    input.spellcheck = false
    input.placeholder = task.placeholder || 'например: Just 4'
    label.htmlFor = input.id

    form.appendChild(label)
    form.appendChild(input)
    body.appendChild(form)

    return {
      read: function () {
        return input.value
      },
      fill: function (value) {
        input.value = value || ''
      },
      focus: function () {
        input.focus()
      },
      enter: function (fn) {
        form.addEventListener('submit', function (event) {
          event.preventDefault()
          fn()
        })
      }
    }
  }

  function controlChoice(task, body) {
    var group = el('div', 'choices')
    group.setAttribute('role', 'radiogroup')
    group.setAttribute('aria-label', 'Варианты ответа')

    ;(task.options || []).forEach(function (option) {
      var label = el('label', 'choice')
      var input = el('input')
      input.type = 'radio'
      input.name = 'answer-' + task.id
      input.value = option.id
      label.appendChild(input)
      label.appendChild(elHtml('span', null, md(option.label)))
      group.appendChild(label)
    })

    body.appendChild(group)

    var radios = function () {
      return Array.prototype.slice.call(group.querySelectorAll('input'))
    }

    return {
      read: function () {
        var checked = radios().filter(function (r) {
          return r.checked
        })[0]
        return checked ? checked.value : ''
      },
      fill: function (value) {
        radios().forEach(function (r) {
          r.checked = r.value === value
        })
      },
      focus: function () {
        var first = radios()[0]
        if (first) first.focus()
      },
      enter: function () {
        /* выбор подтверждается кнопкой */
      }
    }
  }

  function controlCode(task, body) {
    if (task.prelude) body.appendChild(codeBlock(task.prelude.trim()))

    var textarea = el('textarea', 'textarea')
    textarea.spellcheck = false
    textarea.rows = 3
    textarea.placeholder = task.placeholder || 'Just(3).map(x => x * 2)'
    body.appendChild(textarea)

    return {
      read: function () {
        return textarea.value
      },
      fill: function (value) {
        textarea.value = value || ''
      },
      focus: function () {
        textarea.focus()
      },
      enter: function (fn) {
        textarea.addEventListener('keydown', function (event) {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            fn()
          }
        })
      }
    }
  }

  function controlMatrix(task, body) {
    var table = el('table', 'matrix')
    var thead = el('thead')
    var headRow = el('tr')
    headRow.appendChild(el('th', null, 'значение'))
    headRow.appendChild(el('th', null, 'уровень интерфейса'))
    thead.appendChild(headRow)
    table.appendChild(thead)

    var tbody = el('tbody')
    var selects = {}

    task.rows.forEach(function (row) {
      var tr = el('tr')
      var nameCell = el('td')
      nameCell.appendChild(el('code', null, row.label))
      tr.appendChild(nameCell)

      var cell = el('td')
      var select = el('select', 'select')
      select.dataset.row = row.id
      select.setAttribute('aria-label', 'Уровень для ' + row.label)

      var empty = el('option', null, '— выбери —')
      empty.value = ''
      select.appendChild(empty)

      task.options.forEach(function (option) {
        var item = el('option', null, option.short || option.label)
        item.value = option.id
        select.appendChild(item)
      })

      selects[row.id] = select
      cell.appendChild(select)
      tr.appendChild(cell)
      tbody.appendChild(tr)
    })

    table.appendChild(tbody)
    body.appendChild(table)

    return {
      read: function () {
        var answer = {}
        Object.keys(selects).forEach(function (id) {
          answer[id] = selects[id].value
        })
        return answer
      },
      fill: function (value) {
        Object.keys(selects).forEach(function (id) {
          selects[id].value = (value && value[id]) || ''
        })
      },
      focus: function () {
        var first = selects[Object.keys(selects)[0]]
        if (first) first.focus()
      },
      enter: function () {
        /* таблица подтверждается кнопкой */
      },
      mark: function (answer) {
        task.rows.forEach(function (row) {
          var cell = selects[row.id].parentNode
          cell.classList.remove('matrix__cell--ok')
          cell.classList.remove('matrix__cell--fail')
          if (!answer[row.id]) return
          cell.classList.add(
            answer[row.id] === row.answer
              ? 'matrix__cell--ok'
              : 'matrix__cell--fail'
          )
        })
      }
    }
  }

  var CONTROLS = {
    input: controlInput,
    choice: controlChoice,
    code: controlCode,
    matrix: controlMatrix
  }

  /* ------------------------------------------------------------------ */
  /* карточка задания                                                   */
  /* ------------------------------------------------------------------ */

  function answerHtml(task) {
    if (task.type === 'input') {
      return '<strong>Ответ:</strong> <code>' + escapeHtml(task.expected) + '</code>'
    }

    if (task.type === 'choice') {
      var right = (task.options || []).filter(function (o) {
        return o.id === task.answer
      })[0]
      return '<strong>Ответ:</strong> ' + md(right ? right.label : task.answer)
    }

    if (task.type === 'code') {
      return (
        '<strong>Ответ:</strong>' +
        '<pre class="code"><code>' +
        escapeHtml(task.target.solution) +
        '</code></pre>' +
        '<div>Результат: <code>' +
        escapeHtml(task.target.value) +
        '</code></div>'
      )
    }

    if (task.type === 'matrix') {
      var items = task.rows
        .map(function (row) {
          var option = (task.options || []).filter(function (o) {
            return o.id === row.answer
          })[0]
          return (
            '<li><code>' +
            escapeHtml(row.label) +
            '</code> — ' +
            md(option ? option.short || option.label : row.answer) +
            '</li>'
          )
        })
        .join('')
      return '<strong>Ответ:</strong><ul>' + items + '</ul>'
    }

    return ''
  }

  function renderCard(task, index) {
    var article = el('article', 'task')
    article.id = 'task-' + task.id
    article.dataset.task = task.id

    var head = el('header', 'task__head')
    head.appendChild(el('span', 'task__num', String(index)))
    head.appendChild(elHtml('h3', 'task__title', md(task.title)))
    head.appendChild(
      el('span', 'badge badge--' + task.type, BADGES[task.type] || task.type)
    )
    article.appendChild(head)

    if (task.ask) article.appendChild(elHtml('p', 'task__ask', md(task.ask)))

    var body = el('div', 'task__body')
    article.appendChild(body)
    if (task.type === 'input') body.appendChild(codeBlock(readingCode(task)))

    var api = (CONTROLS[task.type] || controlInput)(task, body)

    var actions = el('div', 'task__actions')
    var checkBtn = el('button', 'btn btn--primary btn--sm', 'Проверить')
    var hintBtn = el('button', 'btn btn--ghost btn--sm', 'Подсказка')
    var answerBtn = el('button', 'btn btn--ghost btn--sm', 'Показать ответ')
    checkBtn.setAttribute('data-act', 'check')
    hintBtn.setAttribute('data-act', 'hint')
    answerBtn.setAttribute('data-act', 'answer')
    ;[checkBtn, hintBtn, answerBtn].forEach(function (btn) {
      btn.type = 'button'
      actions.appendChild(btn)
    })

    var status = el('span', 'task__status')
    actions.appendChild(status)
    article.appendChild(actions)

    var hintBox = elHtml(
      'div',
      'task__extra',
      '<strong>Подсказка.</strong> ' + md(task.hint || '')
    )
    hintBox.hidden = true
    article.appendChild(hintBox)
    if (!task.hint) hintBtn.disabled = true

    var answerBox = elHtml('div', 'task__extra', answerHtml(task))
    answerBox.hidden = true
    article.appendChild(answerBox)

    var feedback = el('div', 'feedback')
    feedback.setAttribute('aria-live', 'polite')
    article.appendChild(feedback)

    checkBtn.addEventListener('click', function () {
      runCheck(task)
    })

    hintBtn.addEventListener('click', function () {
      hintBox.hidden = !hintBox.hidden
      hintBtn.textContent = hintBox.hidden ? 'Подсказка' : 'Скрыть подсказку'
    })

    answerBtn.addEventListener('click', function () {
      answerBox.hidden = !answerBox.hidden
      answerBtn.textContent = answerBox.hidden
        ? 'Показать ответ'
        : 'Скрыть ответ'
    })

    api.enter(function () {
      runCheck(task)
    })

    cards[task.id] = {
      el: article,
      api: api,
      status: status,
      feedback: feedback,
      hintBtn: hintBtn,
      answerBtn: answerBtn
    }

    return article
  }

  /* ------------------------------------------------------------------ */
  /* проверка и результат                                               */
  /* ------------------------------------------------------------------ */

  function checkCode(task, code) {
    var source = String(code == null ? '' : code).trim()
    if (!source) {
      return { info: 'Напиши одно выражение — например: `Just(3).map(x => x * 2)`.' }
    }

    var evaluate
    try {
      evaluate = makeEvaluator(task.prelude)
    } catch (error) {
      return { info: 'Песочница недоступна: ' + error.message + '.' }
    }

    var value
    try {
      value = evaluate(source)
    } catch (error) {
      return {
        ok: false,
        message:
          'Код не выполнился: `' +
          error.name +
          ': ' +
          error.message +
          '`. Нужно одно выражение, которое возвращает контейнер.'
      }
    }

    if (!root.crocks.isFunctor(value)) {
      return {
        ok: false,
        message:
          'Вернулось голое значение `' +
          String(value) +
          '`, а нужен контейнер — `Maybe` с ответом внутри.'
      }
    }

    var got = String(value)
    var expected = String(task.target.value)

    if (normalize(got) === normalize(expected)) {
      return { ok: true, message: 'Получилось `' + got + '` — верно.' }
    }

    var nested = ''
    if (task.target.nestedTip && /just\s+just/i.test(got)) {
      nested = ' ' + task.target.nestedTip
    }

    return {
      ok: false,
      message:
        'Получилось `' +
        got +
        '`, а нужно `' +
        expected +
        '`.' +
        nested
    }
  }

  var CHECKERS = {
    input: checkInput,
    choice: checkChoice,
    matrix: checkMatrix
  }

  function showFeedback(card, outcome) {
    var state = outcome.info ? 'info' : outcome.ok ? 'ok' : 'fail'
    var prefix = outcome.info
      ? ''
      : outcome.ok
        ? '**Верно.** '
        : '**Не то.** '

    card.feedback.className = 'feedback feedback--' + state
    card.feedback.innerHTML = md(prefix + (outcome.message || ''))
  }

  function applyOutcome(task, card, answer, outcome) {
    if (outcome.info) {
      showFeedback(card, outcome)
      return
    }

    results[task.id] = { ok: !!outcome.ok, answer: answer }
    writeStorage(results)

    card.el.classList.toggle('task--ok', !!outcome.ok)
    card.el.classList.toggle('task--fail', !outcome.ok)
    card.status.textContent = outcome.ok ? 'решено' : 'пока нет'
    card.status.className =
      'task__status task__status--' + (outcome.ok ? 'ok' : 'fail')

    if (card.api.mark) card.api.mark(answer)

    showFeedback(card, outcome)
    updateProgress()
    renderSummary()
  }

  function runCheck(task) {
    var card = cards[task.id]
    if (!card) return Promise.resolve()

    var answer = card.api.read()

    if (task.type !== 'code') {
      var checker = CHECKERS[task.type]
      if (checker) applyOutcome(task, card, answer, checker(task, answer))
      return Promise.resolve()
    }

    return loadCrocks().then(function (crocks) {
      if (!crocks) {
        showFeedback(card, {
          info:
            'Браузер не смог загрузить `crocks`, поэтому проверки кода недоступны. ' +
            'Выполни `npm install` в корне курса и обнови страницу.'
        })
        return
      }
      applyOutcome(task, card, answer, checkCode(task, answer))
    })
  }

  function checkAllFilled() {
    var filled = tasks.filter(function (task) {
      var card = cards[task.id]
      if (!card) return false
      var answer = card.api.read()
      if (task.type === 'matrix') {
        return Object.keys(answer).some(function (id) {
          return !!answer[id]
        })
      }
      return String(answer == null ? '' : answer).trim() !== ''
    })

    return filled.reduce(function (chain, task) {
      return chain.then(function () {
        return runCheck(task)
      })
    }, Promise.resolve())
  }

  /* ------------------------------------------------------------------ */
  /* прогресс, итог, сброс                                              */
  /* ------------------------------------------------------------------ */

  function solvedCount() {
    return tasks.filter(function (task) {
      return results[task.id] && results[task.id].ok
    }).length
  }

  function updateProgress() {
    var total = tasks.length
    var solved = solvedCount()
    var percent = total ? Math.round((solved / total) * 100) : 0

    var counter = document.querySelector('[data-progress-text]')
    if (counter) counter.textContent = solved + ' / ' + total

    var bar = document.querySelector('[data-progress-bar]')
    if (bar) bar.style.width = percent + '%'

    var label = document.querySelector('[data-progress-label]')
    if (label) {
      label.textContent = solved + ' из ' + total + ' заданий решено'
    }
  }

  function sectionTitle(id) {
    var found = (lesson.sections || []).filter(function (section) {
      return section.id === id
    })[0]
    return found ? found.title : ''
  }

  function renderSummary() {
    var host = document.getElementById('summary')
    if (!host) return

    var total = tasks.length
    var solved = solvedCount()
    var percent = total ? Math.round((solved / total) * 100) : 0
    var pending = tasks.filter(function (task) {
      return !results[task.id] || !results[task.id].ok
    })
    var failed = pending.filter(function (task) {
      return !!results[task.id]
    })

    var html = '<h2>Итог практики</h2>'
    html +=
      '<p class="summary__score">' +
      solved +
      ' из ' +
      total +
      ' <small>· ' +
      percent +
      '%</small></p>'

    if (!pending.length) {
      html +=
        '<p class="summary__done">Все задания решены. ' +
        (lesson.next ? md(lesson.next) : 'Можно переходить к следующему уроку.') +
        '</p>'
    } else {
      html +=
        '<p>Осталось: ' +
        pending.length +
        (failed.length
          ? ' (из них с неверным ответом — ' + failed.length + ')'
          : '') +
        '. Задания ниже — те, что ещё не сошлись.</p>'

      html +=
        '<ul>' +
        pending
          .slice(0, 8)
          .map(function (task) {
            return (
              '<li><a href="#task-' +
              task.id +
              '">' +
              md(task.title) +
              '</a> — ' +
              md(sectionTitle(task.section)) +
              '</li>'
            )
          })
          .join('') +
        '</ul>'
    }

    host.innerHTML = html
  }

  function restoreState() {
    results = readStorage()

    tasks.forEach(function (task) {
      var card = cards[task.id]
      var saved = results[task.id]
      if (!card || !saved) return

      card.api.fill(saved.answer)

      card.el.classList.add(saved.ok ? 'task--ok' : 'task--fail')
      card.status.textContent = saved.ok ? 'решено' : 'пока нет'
      card.status.className =
        'task__status task__status--' + (saved.ok ? 'ok' : 'fail')

      if (card.api.mark) card.api.mark(saved.answer)
    })
  }

  function resetAll() {
    results = {}
    writeStorage(results)

    tasks.forEach(function (task) {
      var card = cards[task.id]
      if (!card) return

      card.api.fill('')
      card.el.classList.remove('task--ok', 'task--fail')
      card.status.textContent = ''
      card.status.className = 'task__status'
      card.feedback.className = 'feedback'
      card.feedback.innerHTML = ''

      if (card.api.mark) card.api.mark({})
    })

    updateProgress()
    renderSummary()
  }

  /* ------------------------------------------------------------------ */
  /* запуск страницы                                                    */
  /* ------------------------------------------------------------------ */

  function bindGlobal() {
    var reset = document.querySelector('[data-act="reset"]')
    if (reset) {
      reset.addEventListener('click', function () {
        if (reset.dataset.armed === '1') {
          reset.dataset.armed = '0'
          reset.textContent = 'Сбросить'
          resetAll()
          return
        }
        reset.dataset.armed = '1'
        reset.textContent = 'Точно сбросить?'
        root.setTimeout(function () {
          reset.dataset.armed = '0'
          reset.textContent = 'Сбросить'
        }, 4000)
      })
    }

    var checkAll = document.querySelector('[data-act="check-all"]')
    if (checkAll) {
      checkAll.addEventListener('click', function () {
        checkAllFilled()
      })
    }
  }

  function reportCrocks(crocks) {
    var chip = document.querySelector('[data-crocks-status]')
    if (!chip) return

    if (crocks) {
      chip.textContent = 'crocks подключён — проверки кода работают'
      chip.classList.remove('note--warn', 'hidden')
    } else {
      chip.textContent =
        'crocks не подключён: проверки кода отключены. Выполни npm install в корне курса и обнови страницу.'
      chip.classList.add('note--warn')
      chip.classList.remove('hidden')
    }
  }

  var mounted = false

  function start() {
    if (mounted || !lesson) return

    var mount = document.getElementById('tasks')
    if (!mount) return

    mounted = true
    tasks = (lesson.tasks || []).slice()
    mount.textContent = ''

    var index = 0
    ;(lesson.sections || []).forEach(function (section) {
      var list = tasks.filter(function (task) {
        return task.section === section.id
      })
      if (!list.length) return

      var box = el('section', 'section')
      box.id = 'section-' + section.id

      var head = el('div', 'section__head')
      head.appendChild(elHtml('h2', null, md(section.title)))
      if (section.note) head.appendChild(elHtml('span', null, md(section.note)))
      box.appendChild(head)

      list.forEach(function (task) {
        index += 1
        box.appendChild(renderCard(task, index))
      })

      mount.appendChild(box)
    })

    restoreState()
    bindGlobal()
    updateProgress()
    renderSummary()

    loadCrocks().then(reportCrocks)
  }

  /* ------------------------------------------------------------------ */
  /* публичный API                                                      */
  /* ------------------------------------------------------------------ */

  root.Practice = {
    lesson: function (definition) {
      lesson = definition
      if (document.readyState !== 'loading') start()
    },
    start: start
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})(typeof window !== 'undefined' ? window : globalThis)
