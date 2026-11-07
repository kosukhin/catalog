/* ==========================================================================
   Демо курса crocks — движок интерактивных сцен.
   --------------------------------------------------------------------------
   Как это работает:
     • файл урока (assets/scenes-N.js) описывает сцены данными: контролы,
       функция run(state, crocks) → { view, steps }, функция draw(view, stage, kit)
       и вызывает Demo.page({ ... });
     • этот файл рисует карточки сцен, контролы и «ленту операций»;
     • значения в ленте считает настоящий crocks 0.12.4 прямо в браузере
       (dist-сборка из node_modules, запасной вариант — CDN), а рядом стоит
       статический эталон из файла сцены. Совпало → ✓, не совпало → ⚠.

   Зачем эталон статический: так сцена не может «подогнать» ответ под библиотеку.
   Все эталоны при всех положениях контролов сверяет scripts/check-demo.mjs.
   ========================================================================== */

;(function (root) {
  'use strict'

  var CROCKS_VERSION = '0.12.4'

  var CROCKS_SOURCES = [
    '../node_modules/crocks/dist/crocks.min.js',
    'https://unpkg.com/crocks@' + CROCKS_VERSION + '/dist/crocks.min.js'
  ]

  var crocks = null
  var crocksFailed = false
  var crocksPromise = null
  var renderers = []

  /* ------------------------------------------------------------------ */
  /* DOM и мини-разметка                                                */
  /* ------------------------------------------------------------------ */

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text != null) node.textContent = text
    return node
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // `код`, **жирный**, перенос строки — этого хватает текстам сцен.
  function md(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
  }

  function elHtml(tag, className, text) {
    var node = el(tag, className)
    node.innerHTML = md(text)
    return node
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild)
  }

  /* ------------------------------------------------------------------ */
  /* kit — из чего собираются визуализации                              */
  /* ------------------------------------------------------------------ */

  /*
    box({ label, value, sub, tone, inner })
      tone: 'ok' | 'fail' | 'warn' | 'accent' | 'ghost'
      inner — вложенная коробка (визуал `Just Just 6`)
  */
  function box(options) {
    var opts = options || {}
    var className = 'vbox'
    if (opts.tone) className += ' vbox--' + opts.tone
    if (opts.nest) className += ' vbox--nest'
    if (opts.code) className += ' vbox--code'
    if (opts.animate !== false) className += ' vbox--pop'

    var node = el('div', className)
    if (opts.label) node.appendChild(el('span', 'vbox__label', opts.label))
    if (opts.value != null) {
      node.appendChild(el('span', 'vbox__value', String(opts.value)))
    }
    if (opts.sub) node.appendChild(el('span', 'vbox__sub', opts.sub))
    if (opts.inner) node.appendChild(box(opts.inner))
    return node
  }

  // arrow('map', true) — стрелка «назад» (контравариантное направление).
  function arrow(label, back) {
    var node = el('div', 'varrow' + (back ? ' varrow--back' : ''))
    if (label) node.appendChild(el('span', 'varrow__label', label))
    node.appendChild(el('span', 'varrow__line'))
    return node
  }

  function flow(children, modifier) {
    var node = el('div', 'vflow' + (modifier ? ' ' + modifier : ''))
    ;(children || []).forEach(function (child) {
      if (child) node.appendChild(child)
    })
    return node
  }

  function stack(children) {
    var node = flow(children)
    node.classList.add('vstack')
    return node
  }

  function note(text, tone) {
    return elHtml('p', 'vmsg' + (tone ? ' vmsg--' + tone : ''), text)
  }

  function caption(text) {
    return el('p', 'stage__caption', text)
  }

  var kit = {
    el: el,
    md: md,
    elHtml: elHtml,
    clear: clear,
    box: box,
    arrow: arrow,
    flow: flow,
    stack: stack,
    note: note,
    caption: caption
  }

  /* ------------------------------------------------------------------ */
  /* crocks: ленивая загрузка                                           */
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

  // Сначала локальная dist-сборка (после npm install), затем CDN.
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

  function nodes(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector))
  }

  function setStatus(state) {
    var loaded = state === 'on'
    var loading = state === 'loading'

    nodes('[data-engine]').forEach(function (node) {
      node.classList.toggle('engine--on', loaded)
      node.classList.toggle('engine--off', state === 'off')

      var text = node.querySelector('[data-engine-text]')
      if (text) {
        text.textContent = loaded
          ? 'crocks ' + CROCKS_VERSION + ' загружен'
          : loading
            ? 'загружаю crocks…'
            : 'crocks не загружен'
      }
    })

    nodes('[data-engine-warning]').forEach(function (node) {
      node.classList.toggle('hidden', state !== 'off')
    })
  }

  /* ------------------------------------------------------------------ */
  /* контролы сцены                                                     */
  /* ------------------------------------------------------------------ */

  function defaults(controls) {
    var state = {}

    ;(controls || []).forEach(function (control) {
      if (control.value != null) state[control.id] = control.value
      else if (control.type === 'range') state[control.id] = control.min || 0
      else if (control.options && control.options.length) {
        state[control.id] = control.options[0].value
      } else state[control.id] = ''
    })

    return state
  }

  function controlNode(control, state, onChange) {
    var isChips = control.type === 'chips'
    var wrap = el(isChips ? 'div' : 'label', 'ctrl')
    if (control.wide) wrap.classList.add('ctrl--wide')
    wrap.appendChild(el('span', 'ctrl__label', control.label))

    if (isChips) {
      var group = el('div', 'chips')
      var buttons = []

      ;(control.options || []).forEach(function (option) {
        var button = el('button', 'chip', option.label)
        button.type = 'button'
        button.setAttribute('aria-pressed', String(state[control.id] === option.value))
        button.addEventListener('click', function () {
          state[control.id] = option.value
          buttons.forEach(function (other) {
            other.setAttribute('aria-pressed', String(other === button))
          })
          onChange()
        })
        buttons.push(button)
        group.appendChild(button)
      })

      wrap.appendChild(group)
      return wrap
    }

    if (control.type === 'text') {
      var input = el('input')
      input.type = 'text'
      input.value = state[control.id]
      input.spellcheck = false
      input.autocomplete = 'off'
      if (control.placeholder) input.placeholder = control.placeholder
      input.addEventListener('input', function () {
        state[control.id] = input.value
        onChange()
      })
      wrap.appendChild(input)
      return wrap
    }

    if (control.type === 'range') {
      var slider = el('input')
      slider.type = 'range'
      slider.min = control.min
      slider.max = control.max
      slider.step = control.step || 1
      slider.value = state[control.id]

      var out = el('span', 'ctrl__value', String(state[control.id]))
      slider.addEventListener('input', function () {
        state[control.id] = slider.value
        out.textContent = slider.value
        onChange()
      })

      wrap.appendChild(slider)
      wrap.appendChild(out)
      return wrap
    }

    var select = el('select')
    ;(control.options || []).forEach(function (option) {
      var item = el('option', null, option.label)
      item.value = option.value
      if (option.value === state[control.id]) item.selected = true
      select.appendChild(item)
    })
    select.addEventListener('change', function () {
      state[control.id] = select.value
      onChange()
    })

    wrap.appendChild(select)
    return wrap
  }

  /* ------------------------------------------------------------------ */
  /* лента операций: что говорит crocks                                 */
  /* ------------------------------------------------------------------ */

  function renderSteps(container, steps) {
    container.appendChild(el('p', 'steps__caption', 'что говорит crocks'))

    steps.forEach(function (step) {
      var row = el('div', 'step')
      row.appendChild(el('code', 'step__code', step.code))
      row.appendChild(el('span', 'step__arrow', '→'))
      row.appendChild(el('span', 'step__value', String(step.value)))

      var badge = el('span', 'step__badge')
      if (step.expect == null) {
        badge.textContent = '—'
      } else if (String(step.value) === String(step.expect)) {
        badge.classList.add('step__badge--ok')
        badge.textContent = '✓'
        badge.title = 'совпало с эталоном'
      } else {
        badge.classList.add('step__badge--fail')
        badge.textContent = '⚠ ' + step.expect
        badge.title = 'демо расходится с библиотекой'
      }
      row.appendChild(badge)

      if (step.note) row.appendChild(el('div', 'step__note', step.note))
      container.appendChild(row)
    })
  }

  /* ------------------------------------------------------------------ */
  /* карточка сцены                                                     */
  /* ------------------------------------------------------------------ */

  function sceneNode(scene, index) {
    var state = defaults(scene.controls)
    var card = el('article', 'scene')
    card.id = 'scene-' + scene.id

    var head = el('div', 'scene__head')
    head.appendChild(
      el('span', 'scene__num', scene.kicker || 'сцена ' + (index + 1))
    )
    head.appendChild(el('h2', 'scene__title', scene.title))
    card.appendChild(head)

    card.appendChild(elHtml('p', 'scene__idea', scene.idea || ''))

    var controls = el('div', 'scene__controls')
    var stage = el('div', 'stage')
    var steps = el('div', 'steps')

    card.appendChild(controls)
    card.appendChild(stage)
    card.appendChild(steps)

    if (scene.hint) card.appendChild(elHtml('p', 'scene__hint', scene.hint))

    function update() {
      clear(stage)
      clear(steps)

      if (!crocks) {
        stage.appendChild(
          el(
            'p',
            crocksFailed ? 'vmsg vmsg--warn' : 'vmsg',
            crocksFailed
              ? 'Библиотека crocks не загружена: сцена не может посчитать значения. ' +
                'Выполни npm install в корне курса или открой страницу с интернетом.'
              : 'Загружаю crocks…'
          )
        )
        return
      }

      var out
      try {
        out = scene.run(state, crocks)
      } catch (error) {
        stage.appendChild(
          el('p', 'vmsg vmsg--fail', 'Сцена не отрисовалась: ' + error.message)
        )
        return
      }

      stage.appendChild(caption(scene.stageCaption || 'что происходит'))
      scene.draw(out.view || {}, stage, kit)
      renderSteps(steps, out.steps || [])
    }

    ;(scene.controls || []).forEach(function (control) {
      controls.appendChild(controlNode(control, state, update))
    })

    renderers.push(update)
    update()
    return card
  }

  /* ------------------------------------------------------------------ */
  /* страница                                                           */
  /* ------------------------------------------------------------------ */

  function page(lesson) {
    var host = document.querySelector('[data-scenes]')
    var nav = document.querySelector('[data-scene-nav]')
    var scenes = lesson.scenes || []
    var indexEl = document.querySelector('[data-scene-total]')

    if (indexEl) indexEl.textContent = String(scenes.length)

    if (host) {
      scenes.forEach(function (scene, index) {
        host.appendChild(sceneNode(scene, index))
      })
    }

    if (nav) {
      scenes.forEach(function (scene, index) {
        var link = el(
          'a',
          null,
          index + 1 + '. ' + String(scene.title).replace(/`/g, '')
        )
        link.href = '#scene-' + scene.id
        nav.appendChild(link)
      })
    }

    setStatus('loading')

    loadCrocks().then(function (library) {
      crocks = library
      crocksFailed = !library
      setStatus(library ? 'on' : 'off')
      renderers.forEach(function (update) {
        update()
      })
    })
  }

  root.Demo = {
    version: CROCKS_VERSION,
    page: page,
    kit: kit
  }
})(typeof window !== 'undefined' ? window : globalThis)
