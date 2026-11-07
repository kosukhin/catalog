#!/usr/bin/env node
/**
 * Проверка 3D-демо «доставка дроном» без браузера и без three.js.
 *
 * Запуск:  npm run check:drone   (или: node scripts/check-drone.mjs)
 *
 * Что проверяется:
 *   • все комбинации контролов: на каждом шаге ленты живой вывод crocks
 *     (Maybe / Reader / Either) совпадает со статическим эталоном;
 *   • решение диспетчера согласовано: «вылет» ⇔ нет причины отказа;
 *   • кадры: заряд только уменьшается и в конце равен «стартовый − расход»,
 *     дрон не уходит под землю и не выезжает за маршрут, отказавший рейс
 *     остаётся на базе и не теряет груз, а успешный — сбрасывает его
 *     (`Maybe` → `Nothing`) и садится обратно.
 *
 * three.js здесь не нужен: сцена — это данные, а не пиксели.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import crocks from 'crocks'

const ROOT = path.resolve(import.meta.dirname, '..')
const SOURCE = path.join(ROOT, 'Демо', 'assets', 'drone-model.js')

const CONTROL_TYPES = ['select', 'chips', 'range', 'text']
const FRAME_STEPS = 25
const EPS = 1e-6

let failures = 0
let checkedStates = 0
let checkedSteps = 0
let checkedFrames = 0

function fail(where, message) {
  failures += 1
  console.error(`  ✗ ${where}: ${message}`)
}

/* ------------------------------------------------------------------ */
/* модель — так же, как её загрузит страница                          */
/* ------------------------------------------------------------------ */

const sandbox = {}
new Function('window', await readFile(SOURCE, 'utf8'))(sandbox)

const scene = sandbox.DRONE_DELIVERY && sandbox.DRONE_DELIVERY.scene

if (!scene) {
  console.error('Модель не зарегистрировала window.DRONE_DELIVERY.scene')
  process.exit(1)
}

/* ------------------------------------------------------------------ */
/* перебор состояний контролов                                        */
/* ------------------------------------------------------------------ */

function values(control) {
  if (control.type === 'select' || control.type === 'chips') {
    return (control.options || []).map((option) => option.value)
  }

  if (control.type === 'range') {
    if (control.samples) return control.samples
    return [control.min, (control.min + control.max) / 2, control.max]
  }

  return control.samples || []
}

function combinations(controls) {
  return controls.reduce(
    (states, control) =>
      states.flatMap((state) =>
        values(control).map((value) => Object.assign({}, state, { [control.id]: value }))
      ),
    [{}]
  )
}

function checkControls() {
  const seen = new Set()

  for (const control of scene.controls || []) {
    if (!control.id) {
      fail('контролы', 'у контрола нет id')
      continue
    }

    if (seen.has(control.id)) fail('контролы', `повторяющийся id "${control.id}"`)
    seen.add(control.id)

    if (!CONTROL_TYPES.includes(control.type)) {
      fail(control.id, `неизвестный тип "${control.type}"`)
      continue
    }

    if (!control.label) fail(control.id, 'нет label')

    const list = values(control)
    if (!list.length) fail(control.id, 'нечего перебирать: нет options/samples')
    if (!list.map(String).includes(String(control.value))) {
      fail(control.id, `значение по умолчанию "${control.value}" не из вариантов`)
    }
  }
}

/* ------------------------------------------------------------------ */
/* проверка решения                                                   */
/* ------------------------------------------------------------------ */

function checkModel(state, label) {
  let model

  try {
    model = scene.build(state, crocks)
  } catch (error) {
    fail(label, `build упал: ${error.message}`)
    return null
  }

  if (!Array.isArray(model.phases) || !model.phases.length) {
    fail(label, 'в плане нет фаз полёта')
    return null
  }

  if (!Array.isArray(model.steps) || model.steps.length < 5) {
    fail(label, 'мало шагов в ленте')
    return model
  }

  for (const step of model.steps) {
    checkedSteps += 1

    if (!step.code) fail(label, 'у шага нет code')
    if (typeof step.expect !== 'string') {
      fail(label, `шаг "${step.code}": expect должен быть строкой`)
      continue
    }
    if (String(step.value) !== step.expect) {
      fail(label, `"${step.code}" → "${step.value}", а эталон "${step.expect}"`)
    }
  }

  const verdict = model.steps[model.steps.length - 1]
  const saysFly = String(verdict.value).startsWith('вылет: ')

  if (saysFly !== model.cleared) {
    fail(label, `вердикт "${verdict.value}" расходится с cleared=${model.cleared}`)
  }

  if (model.cleared && model.reason != null) fail(label, 'вылет разрешён, но причина отказа осталась')
  if (!model.cleared && !model.reason) fail(label, 'отказ без причины')

  const shares = model.phases.reduce((sum, phase) => sum + phase.share, 0)
  if (Math.abs(shares - 1) > 1e-9) fail(label, `сумма фаз ${shares}, а должна быть 1`)

  if (model.cleared) {
    const burn = model.phases.reduce((sum, phase) => sum + phase.burn, 0)
    if (Math.abs(burn - 1) > 1e-9) fail(label, `суммарный расход ${burn}, а должен быть 1`)
    if (!(model.need > 0)) fail(label, 'разрешённый рейс без расхода заряда')
  } else if (model.phases.some((phase) => phase.burn !== 0)) {
    fail(label, 'отказавший рейс всё равно тратит заряд')
  }

  return model
}

/* ------------------------------------------------------------------ */
/* проверка кадров                                                    */
/* ------------------------------------------------------------------ */

function maybeOrNull(maybe) {
  return maybe && typeof maybe.option === 'function' ? maybe.option(null) : null
}

function checkFrames(model, label) {
  const env = model.env
  const layout = model.layout
  const phases = new Set()
  let previousBattery = Infinity

  for (let step = 0; step <= FRAME_STEPS; step += 1) {
    const t = step / FRAME_STEPS
    checkedFrames += 1

    let frame

    try {
      frame = scene.frameAt(model, crocks, t)
    } catch (error) {
      fail(label, `frameAt(${t}) упал: ${error.message}`)
      return
    }

    const pose = maybeOrNull(frame.pkg)

    if (!frame.pkg || typeof frame.pkg.option !== 'function') {
      fail(label, `t=${t}: груз — не Maybe`)
    } else if (!/Maybe/.test(String(frame.pkg['@@type']))) {
      fail(label, `t=${t}: груз типа ${frame.pkg['@@type']}`)
    }

    const numbers = [
      ['drone.x', frame.drone.x],
      ['drone.y', frame.drone.y],
      ['drone.z', frame.drone.z],
      ['drone.props', frame.drone.props],
      ['battery', frame.battery],
      ['delivered.progress', frame.delivered.progress]
    ]

    for (const [name, value] of numbers) {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        fail(label, `t=${t}: ${name} = ${value}`)
      }
    }

    if (frame.battery > previousBattery + EPS) {
      fail(label, `t=${t}: заряд вырос ${previousBattery} → ${frame.battery}`)
    }
    previousBattery = frame.battery

    if (frame.battery < -EPS || frame.battery > env.battery + EPS) {
      fail(label, `t=${t}: заряд ${frame.battery} вне 0…${env.battery}`)
    }

    if (frame.drone.y < layout.landedY - 0.05) fail(label, `t=${t}: дрон под землёй (${frame.drone.y})`)
    if (frame.drone.y > layout.cruiseY + 0.4) fail(label, `t=${t}: дрон выше эшелона (${frame.drone.y})`)
    if (frame.drone.x < layout.base.x - 1.6 || frame.drone.x > layout.client.x + 1.6) {
      fail(label, `t=${t}: дрон улетел с маршрута (x=${frame.drone.x})`)
    }
    if (frame.drone.props < -EPS || frame.drone.props > 1 + EPS) {
      fail(label, `t=${t}: обороты ${frame.drone.props} вне 0…1`)
    }

    if (!['preflight', 'climb', 'cruise', 'descend', 'drop', 'climbBack', 'return', 'land', 'shutdown'].includes(frame.phase)) {
      fail(label, `t=${t}: неизвестная фаза "${frame.phase}"`)
    }

    phases.add(frame.phase)

    if (!model.cleared) {
      if (Math.abs(frame.drone.x - layout.base.x) > 0.6 || Math.abs(frame.drone.z - layout.base.z) > 0.6) {
        fail(label, `t=${t}: отказавший рейс уехал с базы`)
      }
      if (Math.abs(frame.battery - env.battery) > EPS) {
        fail(label, `t=${t}: отказ, а заряд изменился (${frame.battery})`)
      }
      if (frame.delivered.visible) fail(label, `t=${t}: отказ, но посылка «доставлена»`)
      if (!pose) fail(label, `t=${t}: отказ, а груз исчез с борта`)
    }
  }

  const end = scene.frameAt(model, crocks, 1)

  if (model.cleared) {
    if (!end.landed) fail(label, 'в конце дрон не сел на базу')
    if (Math.abs(end.battery - (env.battery - model.need)) > 0.05) {
      fail(label, `в конце заряд ${end.battery}, а ждали ${env.battery - model.need}`)
    }
    if (maybeOrNull(end.pkg)) fail(label, 'груз остался на борту после сброса')
    if (!end.delivered.visible) fail(label, 'посылка не оказалась на площадке')
    if (Math.abs(end.delivered.progress - 1) > EPS) fail(label, 'посылка не долетела до площадки')
    if (!phases.has('cruise')) fail(label, 'в кадрах нет фазы полёта')
    if (!phases.has('drop')) fail(label, 'в кадрах нет фазы сброса')
    if (end.phase !== 'land') fail(label, `в конце фаза "${end.phase}", а ждали посадку`)
    if (end.beacon === 'fail') fail(label, 'успешный рейс мигает красным')
  } else {
    if (!end.landed) fail(label, 'отказ: дрон не заглушен')
    if (Math.abs(end.battery - env.battery) > EPS) fail(label, 'отказ: заряд всё-таки потрачен')
    if (end.delivered.visible) fail(label, 'отказ: посылка «доставлена»')
    if (!maybeOrNull(end.pkg)) fail(label, 'отказ: груз пропал без вылета')
    if (end.beacon !== 'fail') fail(label, `отказ: сигнал "${end.beacon}", а ждали fail`)
    if (!end.reason) fail(label, 'отказ без причины в кадре')
  }

  if (scene.frameAt(model, crocks, -1).t !== 0) fail(label, 't < 0 не зажимается к 0')
  if (scene.frameAt(model, crocks, 2).t !== 1) fail(label, 't > 1 не зажимается к 1')
}

/* ------------------------------------------------------------------ */
/* прогон                                                             */
/* ------------------------------------------------------------------ */

console.log(`Модель: ${path.relative(ROOT, SOURCE)}`)
console.log(`Сцена: ${scene.id} · ${scene.title}`)

checkControls()

const states = combinations(scene.controls || [])

if (states.length > 500) fail('контролы', `слишком много состояний: ${states.length}`)

for (const state of states) {
  checkedStates += 1

  const label = `[${state.address}/${state.payload}кг/${state.wind}мс/${state.battery}%/×${state.speed}]`
  const model = checkModel(state, label)

  if (model) checkFrames(model, label)
}

if (failures) {
  console.error(`\nНайдено расхождений: ${failures}`)
  process.exit(1)
}

console.log(
  `\nВсё сходится: ${checkedStates} состояний, ${checkedSteps} шагов, ` +
    `${checkedFrames} кадров проверено.`
)
