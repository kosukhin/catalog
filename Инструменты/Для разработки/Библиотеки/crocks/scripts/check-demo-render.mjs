#!/usr/bin/env node
/**
 * Проверка отрисовки демосцен без браузера.
 *
 * Запуск:  node scripts/check-demo-render.mjs
 * (входит в npm run check:demo — вторым шагом после сверки эталонов)
 *
 * Что делает:
 *   • поднимает минимальный DOM-стаб (createElement/appendChild/classList/…);
 *   • загружает Демо/assets/demo.js и каждый scenes-*.js ровно так, как это
 *     сделала бы страница (два <script>);
 *   • проверяет, что для каждой сцены собралась карточка с контролами, сценой
 *     и лентой шагов, и что в ленте нет ⚠ (расхождений с эталоном);
 *   • дёргает каждый контрол (chips/select/range/text) и повторяет проверку —
 *     так ловятся ошибки в обработчиках и в draw(), которые видит только браузер.
 *
 * Это дымовой тест движка, а не замена браузеру: CSS и внешний вид не проверяются.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import crocks from 'crocks'

const ROOT = path.resolve(import.meta.dirname, '..')
const ASSETS = path.join(ROOT, 'Демо', 'assets')

let failures = 0

function fail(where, message) {
  failures += 1
  console.error(`  ✗ ${where}: ${message}`)
}

/* ------------------------------------------------------------------ */
/* минимальный DOM                                                    */
/* ------------------------------------------------------------------ */

function makeNode(tag) {
  const node = {
    tag,
    type: '',
    value: '',
    className: '',
    textContent: '',
    title: '',
    children: [],
    attrs: {},
    listeners: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false
      },
    },
    appendChild(child) {
      node.children.push(child)
      return child
    },
    removeChild(child) {
      const index = node.children.indexOf(child)
      if (index >= 0) node.children.splice(index, 1)
      return child
    },
    setAttribute(name, value) {
      node.attrs[name] = value
    },
    getAttribute(name) {
      return node.attrs[name]
    },
    querySelector(selector) {
      return (node.selectors && node.selectors[selector]) || null
    },
    querySelectorAll(selector) {
      return (node.selectorsAll && node.selectorsAll[selector]) || []
    },
    addEventListener(type, handler) {
      node.listeners[type] = handler
    },
    get firstChild() {
      return node.children[0] || null
    },
  }

  Object.defineProperty(node, 'innerHTML', {
    get() {
      return node.html || ''
    },
    set(value) {
      node.html = value
    },
  })

  return node
}

const host = makeNode('div')
const nav = makeNode('nav')
const total = makeNode('span')
const engine = makeNode('span')
const engineText = makeNode('span')

engine.selectors = { '[data-engine-text]': engineText }

const document = {
  head: makeNode('head'),
  createElement: makeNode,
  querySelector(selector) {
    if (selector === '[data-scenes]') return host
    if (selector === '[data-scene-nav]') return nav
    if (selector === '[data-scene-total]') return total
    return null
  },
  querySelectorAll(selector) {
    if (selector === '[data-engine]') return [engine]
    return []
  },
}

// Библиотека уже «загружена», чтобы сцены считали значения сразу.
const window = { crocks, document }

function evaluate(code, name) {
  new Function('window', 'document', code + '\n//# sourceURL=' + name)(window, document)
}

/* ------------------------------------------------------------------ */
/* загрузка страницы                                                  */
/* ------------------------------------------------------------------ */

evaluate(await readFile(path.join(ASSETS, 'demo.js'), 'utf8'), 'demo.js')

const sceneFiles = (await readdir(ASSETS))
  .filter((file) => /^scenes-.*\.js$/.test(file))
  .sort()

for (const file of sceneFiles) {
  evaluate(await readFile(path.join(ASSETS, file), 'utf8'), file)
}

// даём отработать промису загрузки библиотеки
await new Promise((resolve) => setTimeout(resolve, 20))

if (!host.children.length) {
  fail('страница', 'не собралось ни одной карточки сцены')
}

/* ------------------------------------------------------------------ */
/* разбор карточки                                                    */
/* ------------------------------------------------------------------ */

function stepsOf(card) {
  const steps = card.children[4]
  if (!steps) return null

  const rows = steps.children.filter((child) => child.className === 'step')
  const badges = rows.flatMap((row) =>
    row.children.filter((child) => child.className.startsWith('step__badge'))
  )

  return {
    rows,
    failed: badges.filter((badge) => badge.className.includes('fail')),
  }
}

function checkCard(card, label) {
  const [head, idea, controls, stage, steps] = card.children

  if (!head || !idea || !controls || !stage || !steps) {
    fail(label, 'карточка собрана не полностью: ' + card.children.map((c) => c.className))
    return null
  }
  if (!controls.children.length) fail(label, 'нет ни одного контрола')
  if (stage.children.length < 2) fail(label, 'сцена пустая')

  const info = stepsOf(card)
  if (!info || !info.rows.length) {
    fail(label, 'лента операций пустая')
    return null
  }
  if (info.failed.length) {
    fail(label, 'расхождения: ' + info.failed.map((badge) => badge.textContent).join(' / '))
  }

  return { controls, steps: info }
}

/* ------------------------------------------------------------------ */
/* прогон карточек и контролов                                        */
/* ------------------------------------------------------------------ */

// сцены регистрируются на том объекте, который файл увидел как `window`
const lessons = Object.keys(window)
  .filter((key) => /^DEMO_SCENES_/.test(key) && window[key] && window[key].scenes)
  .map((key) => window[key])

const scenesById = new Map()
for (const lesson of lessons) {
  for (const scene of lesson.scenes) scenesById.set('scene-' + scene.id, scene)
}

if (host.children.length !== scenesById.size) {
  fail('страница', `карточек ${host.children.length}, а сцен в файлах ${scenesById.size}`)
}

if (nav.children.length !== scenesById.size) {
  fail('навигация', `ссылок ${nav.children.length}, а сцен ${scenesById.size}`)
}

if (total.textContent !== String(scenesById.size)) {
  fail('шапка', `в счётчике "${total.textContent}", а сцен ${scenesById.size}`)
}

if (!/загружен/.test(engineText.textContent)) {
  fail('статус', `библиотека не отмечена как загруженная ("${engineText.textContent}")`)
}

for (const card of host.children) {
  const scene = scenesById.get(card.id)
  const label = scene ? scene.id : card.id
  const info = checkCard(card, label)
  if (!info || !scene) continue

  let interactions = 0

  scene.controls.forEach((control, index) => {
    const node = info.controls.children[index]
    if (!node) {
      fail(label, `контрол "${control.id}" не отрисован`)
      return
    }

    const body = node.children[1]
    if (!body) {
      fail(label, `у контрола "${control.id}" нет поля ввода`)
      return
    }

    try {
      if (control.type === 'chips') {
        const button = body.children[1]
        if (!button) return
        button.listeners.click()
        if (button.getAttribute('aria-pressed') !== 'true') {
          fail(label, `чип контрола "${control.id}" не переключился`)
        }
      } else if (control.type === 'select') {
        const option = body.children[1]
        if (!option) return
        body.value = option.value
        body.listeners.change()
      } else if (control.type === 'range') {
        body.value = String(control.max)
        body.listeners.input()
      } else if (control.type === 'text') {
        const sample = (control.samples || [''])[1]
        body.value = sample == null ? '' : sample
        body.listeners.input()
      } else {
        return
      }
      interactions += 1
    } catch (error) {
      fail(label, `контрол "${control.id}" уронил страницу: ${error.message}`)
      return
    }

    const after = stepsOf(card)
    if (!after || !after.rows.length) {
      fail(label, `после изменения "${control.id}" лента опустела`)
    } else if (after.failed.length) {
      fail(
        label,
        `после изменения "${control.id}" расхождения: ` +
          after.failed.map((badge) => badge.textContent).join(' / ')
      )
    }

    const stage = card.children[3]
    if (stage.children.length < 2) {
      fail(label, `после изменения "${control.id}" сцена пустая`)
    }
  })

  console.log(
    `  ✓ ${label}: ${info.steps.rows.length} шагов, ${interactions} контролов проверено`
  )
}

if (failures) {
  console.error(`\nНайдено проблем с отрисовкой: ${failures}`)
  process.exit(1)
}

console.log(
  `\nВсе ${host.children.length} сцен рисуются и реагируют на контролы ` +
    `(проверено без браузера).`
)
