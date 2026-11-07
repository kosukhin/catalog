#!/usr/bin/env node
/**
 * Сверка демосцен с реальным поведением crocks.
 *
 * Запуск:  npm run check:demo        (или: node scripts/check-demo.mjs)
 *
 * Что проверяется для каждого файла Демо/assets/scenes-*.js:
 *   • структура: id, заголовок, описание, контролы, run и draw;
 *   • контролы: известный тип, значение по умолчанию среди вариантов,
 *     у ползунка и текстового поля есть samples для перебора;
 *   • сцена прогоняется при ВСЕХ комбинациях контролов, и каждый шаг
 *     сверяется: живой вывод crocks === статический эталон expect.
 *
 * Так визуал не может «подогнать» ответ: эталон написан руками, а скрипт
 * проверяет его на настоящей библиотеке.
 */

import { readdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import process from 'node:process'

import crocks from 'crocks'

const ROOT = path.resolve(import.meta.dirname, '..')
const ASSETS = path.join(ROOT, 'Демо', 'assets')

const CONTROL_TYPES = ['select', 'chips', 'range', 'text']
const MAX_STATES = 200

let failures = 0
let checkedStates = 0
let checkedSteps = 0

function fail(name, scene, message) {
  failures += 1
  console.error(`  ✗ ${name} · ${scene}: ${message}`)
}

// Какие положения контрола нужно перебрать в проверке.
function values(control) {
  if (control.type === 'select' || control.type === 'chips') {
    return (control.options || []).map((option) => option.value)
  }

  if (control.type === 'range') {
    if (control.samples) return control.samples
    return [control.min, Math.round((control.min + control.max) / 2), control.max]
  }

  return control.samples || []
}

function combinations(controls) {
  return controls.reduce(function (statesSoFar, control) {
    const list = values(control)

    return statesSoFar.flatMap(function (state) {
      return list.map(function (value) {
        return Object.assign({}, state, { [control.id]: value })
      })
    })
  }, [{}])
}

function checkControls(name, scene) {
  const seen = new Set()

  for (const control of scene.controls || []) {
    if (!control.id) {
      fail(name, scene.id, 'у контрола нет id')
      continue
    }
    if (seen.has(control.id)) {
      fail(name, scene.id, `повторяющийся контрол "${control.id}"`)
    }
    seen.add(control.id)

    if (!CONTROL_TYPES.includes(control.type)) {
      fail(name, scene.id, `неизвестный тип контрола "${control.type}"`)
      continue
    }
    if (!control.label) fail(name, scene.id, `у контрола "${control.id}" нет label`)

    const list = values(control)
    if (!list.length) {
      fail(name, scene.id, `контрол "${control.id}" нечего перебирать: нет options/samples`)
    }
    if (!list.includes(control.value)) {
      fail(
        name,
        scene.id,
        `значение по умолчанию "${control.value}" контрола "${control.id}" не из вариантов`
      )
    }
  }
}

function checkScene(name, scene, index) {
  const title = scene.id || 'сцена ' + (index + 1)

  if (!scene.id) fail(name, title, 'у сцены нет id')
  if (!scene.title) fail(name, title, 'нет заголовка')
  if (!scene.idea) fail(name, title, 'нет описания (idea)')
  if (typeof scene.run !== 'function') {
    fail(name, title, 'нет run')
    return 0
  }
  if (typeof scene.draw !== 'function') fail(name, title, 'нет draw')

  checkControls(name, scene)

  const all = combinations(scene.controls || [])
  if (all.length > MAX_STATES) {
    fail(name, title, `слишком много состояний: ${all.length} > ${MAX_STATES}`)
    return 0
  }

  let sceneSteps = 0

  for (const state of all) {
    checkedStates += 1

    let out
    try {
      out = scene.run(state, crocks)
    } catch (error) {
      fail(name, title, `run упал при ${JSON.stringify(state)}: ${error.message}`)
      continue
    }

    if (!out || !Array.isArray(out.steps) || !out.steps.length) {
      fail(name, title, `run не вернул шаги (${JSON.stringify(state)})`)
      continue
    }
    if (!out.view) fail(name, title, 'run не вернул view')

    for (const step of out.steps) {
      sceneSteps += 1
      checkedSteps += 1

      if (!step.code) fail(name, title, 'у шага нет code')
      if (step.value == null) fail(name, title, 'у шага нет value')

      if (typeof step.expect !== 'string') {
        fail(name, title, `шаг "${step.code}": expect должен быть строкой`)
        continue
      }

      if (String(step.value) !== step.expect) {
        fail(
          name,
          title,
          `"${step.code}" → "${step.value}", а эталон "${step.expect}" ` +
            `при ${JSON.stringify(state)}`
        )
      }
    }
  }

  console.log(
    `  ✓ сцена ${index + 1} · ${title}: ${all.length} состояний, ` +
      `${sceneSteps} шагов сверено`
  )

  return all.length
}

const files = (await readdir(ASSETS))
  .filter((file) => /^scenes-.*\.js$/.test(file))
  .sort()

if (!files.length) {
  console.error('Не найдено ни одного файла Демо/assets/scenes-*.js')
  process.exit(1)
}

for (const file of files) {
  await import(pathToFileURL(path.join(ASSETS, file)).href)

  const keys = Object.keys(globalThis).filter(
    (key) =>
      /^DEMO_SCENES_/.test(key) &&
      globalThis[key] &&
      Array.isArray(globalThis[key].scenes)
  )

  if (!keys.length) {
    fail(file, '—', 'файл не зарегистрировал DEMO_SCENES_* с массивом scenes')
    continue
  }

  for (const key of keys) {
    const lesson = globalThis[key]
    const seen = new Set()

    console.log(`${file} → ${key} (${lesson.id || 'без id'}): ${lesson.scenes.length} сцен`)

    lesson.scenes.forEach(function (scene, index) {
      if (scene.id) {
        if (seen.has(scene.id)) fail(file, scene.id, 'повторяющийся id сцены')
        seen.add(scene.id)
      }
      checkScene(file, scene, index)
    })
  }
}

if (failures) {
  console.error(`\nНайдено расхождений: ${failures}`)
  process.exit(1)
}

console.log(
  `\nВсе эталоны совпадают с выводом crocks ` +
    `(${checkedStates} состояний, ${checkedSteps} шагов).`
)
