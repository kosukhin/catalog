/* ==========================================================================
   Служба доставки дроном — модель. Настоящие правила реального диспетчера,
   записанные на crocks. Без DOM и без three.js.

   Кто что делает:
     Maybe   — «есть ли такой адрес в базе площадок?» (Порт 12 → Nothing),
               и «лежит ли ещё груз на борту?» (после сброса → Nothing);
     Reader  — тариф расхода заряда: одна программа, разные условия полёта
               (ветер, вес, дистанция) подставляются окружением;
     Either  — решение диспетчера с человеческой причиной отказа:
               перегруз, сильный ветер, мало заряда, адрес вне зоны;
     State   — сам полёт: фазы, координаты, расход заряда по кадрам.

   build(state, crocks)  — посчитать рейс (решение + план полёта + лента шагов);
   frameAt(model, crocks, t) — кадр анимации для t ∈ [0, 1].

   Проверка: node scripts/check-drone.mjs
   ========================================================================== */

;(function (root) {
  'use strict'

  /* ------------------------------------------------------------------ */
  /* условия эксплуатации (реальные цифры, а не абстракции)             */
  /* ------------------------------------------------------------------ */

  var LIMITS = {
    payload: 2.4, // кг — больше дрон не поднимет
    wind: 9, // м/с — сильнее не летаем
    reserve: 15 // % — ниже этого заряда не возвращаемся
  }

  var PADS = {
    'Лесная 7': { id: 'P-07', distance: 1200 }
    // «Порт 12» в базе нет — это адрес вне зоны обслуживания
  }

  // геометрия сцены
  var BASE_PAD = { x: -7.2, z: -0.8 }
  var CLIENT_PAD = { x: 6.2, z: 1.6 }
  var LANDED_Y = 0.9
  var CRUISE_Y = 3.4
  var HOVER_Y = 2.0
  var PKG_DROP_Y = 0.34
  var PKG_HANG = 0.52

  var STATUS = {
    preflight: 'предполётная проверка',
    climb: 'набор высоты',
    cruise: 'курс на площадку',
    descend: 'снижение к клиенту',
    drop: 'сброс груза',
    climbBack: 'набор высоты после сброса',
    return: 'возврат на базу',
    land: 'посадка',
    shutdown: 'моторы заглушены'
  }

  /* ------------------------------------------------------------------ */
  /* Maybe: адрес → площадка                                           */
  /* ------------------------------------------------------------------ */

  function padFor(env, crocks) {
    return crocks
      .safe(Boolean, PADS[env.address])
      .map(function (pad) {
        return pad.id
      })
  }

  /* ------------------------------------------------------------------ */
  /* Reader: сколько заряда съест этот рейс                             */
  /* ------------------------------------------------------------------ */

  // Одна и та же функция: условия полёта приходят из окружения.
  var fuelReader = function (crocks) {
    return crocks.Reader(function (env) {
      var roundTrip = env.distance * 2
      var perMetre = 0.01 + env.payload * 0.002 + env.wind * 0.0006
      return Math.ceil(roundTrip * perMetre)
    })
  }

  function fuelNeed(env, crocks) {
    return fuelReader(crocks).runWith({
      distance: env.distance,
      payload: env.payload,
      wind: env.wind
    })
  }

  /* ------------------------------------------------------------------ */
  /* Either: проверки диспетчера с причиной отказа                      */
  /* ------------------------------------------------------------------ */

  function fmt(value) {
    return String(value)
  }

  function checkPayload(payload, crocks) {
    if (payload > LIMITS.payload) {
      return crocks.Either.Left(
        'груз ' + fmt(payload) + ' кг тяжелее лимита ' + fmt(LIMITS.payload) + ' кг'
      )
    }

    return crocks.Either.Right(payload)
  }

  function checkWind(wind, crocks) {
    if (wind > LIMITS.wind) {
      return crocks.Either.Left('ветер ' + fmt(wind) + ' м/с сильнее лимита ' + fmt(LIMITS.wind) + ' м/с')
    }

    return crocks.Either.Right(wind)
  }

  function checkBattery(battery, need, crocks) {
    if (battery - need < LIMITS.reserve) {
      return crocks.Either.Left(
        'заряда ' + fmt(battery) + '% не хватает: нужно ' + fmt(need) + '% + резерв ' + LIMITS.reserve + '%'
      )
    }

    return crocks.Either.Right(battery)
  }

  /* ------------------------------------------------------------------ */
  /* решение целиком: Either-цепочка + сборка рейса                     */
  /* ------------------------------------------------------------------ */

  function clearance(env, crocks) {
    var need = fuelNeed(env, crocks)

    return crocks
      .maybeToEither(
        'адрес «' + env.address + '» вне зоны обслуживания',
        padFor(env, crocks)
      )
      .chain(function (pad) {
        return checkPayload(env.payload, crocks).map(function () {
          return pad
        })
      })
      .chain(function (pad) {
        return checkWind(env.wind, crocks).map(function () {
          return pad
        })
      })
      .chain(function (pad) {
        return checkBattery(env.battery, need, crocks).map(function () {
          return pad
        })
      })
      .map(function (pad) {
        return {
          pad: pad,
          need: need,
          summary: pad + ' · ' + env.distance * 2 + ' м · нужно ' + need + '%'
        }
      })
  }

  function verdictText(decision) {
    return decision.either(
      function (reason) {
        return 'отказ: ' + reason
      },
      function (plan) {
        return 'вылет: ' + plan.summary
      }
    )
  }

  /* ------------------------------------------------------------------ */
  /* эталон: те же правила руками, без crocks                           */
  /* ------------------------------------------------------------------ */

  // Цифры посчитаны вручную по формуле 2400 · (0.01 + 0.002·вес + 0.0006·ветер)
  var EXPECT_FUEL = {
    '0.8|0': 28,
    '0.8|6': 37,
    '0.8|12': 46,
    '1.6|0': 32,
    '1.6|6': 41,
    '1.6|12': 49,
    '2.4|0': 36,
    '2.4|6': 45,
    '2.4|12': 53,
    '3.4|0': 41,
    '3.4|6': 49,
    '3.4|12': 58
  }

  var EXPECT_PAD = {
    'Лесная 7': 'Just "P-07"',
    'Порт 12': 'Nothing'
  }

  // вне зоны маршрута нет — и расхода тоже
  function expectFuel(env) {
    if (PADS[env.address] == null) return 0
    return EXPECT_FUEL[env.payload + '|' + env.wind]
  }

  var EXPECT_PAYLOAD = {
    '0.8': 'Right 0.8',
    '1.6': 'Right 1.6',
    '2.4': 'Right 2.4',
    '3.4': 'Left "груз 3.4 кг тяжелее лимита 2.4 кг"'
  }

  var EXPECT_WIND = {
    '0': 'Right 0',
    '6': 'Right 6',
    '12': 'Left "ветер 12 м/с сильнее лимита 9 м/с"'
  }

  function expectBattery(battery, need) {
    if (battery - need < LIMITS.reserve) {
      return (
        'Left "заряда ' + battery + '% не хватает: нужно ' + need + '% + резерв ' +
        LIMITS.reserve + '%"'
      )
    }

    return 'Right ' + battery
  }

  function expectVerdict(env) {
    var fuel = expectFuel(env)

    if (PADS[env.address] == null) return 'отказ: адрес «' + env.address + '» вне зоны обслуживания'
    if (env.payload > LIMITS.payload) {
      return 'отказ: груз ' + env.payload + ' кг тяжелее лимита ' + LIMITS.payload + ' кг'
    }
    if (env.wind > LIMITS.wind) {
      return 'отказ: ветер ' + env.wind + ' м/с сильнее лимита ' + LIMITS.wind + ' м/с'
    }
    if (env.battery - fuel < LIMITS.reserve) {
      return (
        'отказ: заряда ' + env.battery + '% не хватает: нужно ' + fuel + '% + резерв ' +
        LIMITS.reserve + '%'
      )
    }

    return 'вылет: P-07 · ' + env.distance * 2 + ' м · нужно ' + fuel + '%'
  }

  /* ------------------------------------------------------------------ */
  /* окружение заявки                                                   */
  /* ------------------------------------------------------------------ */

  function readEnv(state) {
    var address = String(state.address)
    var pad = PADS[address]

    return {
      address: address,
      payload: Number(state.payload),
      wind: Number(state.wind),
      battery: Number(state.battery),
      speed: Number(state.speed) || 1,
      // вне зоны маршрута нет — считать нечего
      distance: pad ? pad.distance : 0
    }
  }

  /* ------------------------------------------------------------------ */
  /* фазы полёта                                                       */
  /* ------------------------------------------------------------------ */

  var FLIGHT = [
    { id: 'preflight', share: 0.07, air: false },
    { id: 'climb', share: 0.09, air: true },
    { id: 'cruise', share: 0.24, air: true },
    { id: 'descend', share: 0.08, air: true },
    { id: 'drop', share: 0.1, air: true },
    { id: 'climbBack', share: 0.06, air: true },
    { id: 'return', share: 0.26, air: true },
    { id: 'land', share: 0.1, air: true }
  ]

  var GROUNDED = [
    { id: 'preflight', share: 0.45, air: false },
    { id: 'shutdown', share: 0.55, air: false }
  ]

  function lerp(a, b, p) {
    return a + (b - a) * p
  }

  function lerp3(from, to, p) {
    return {
      x: lerp(from.x, to.x, p),
      y: lerp(from.y, to.y, p),
      z: lerp(from.z, to.z, p)
    }
  }

  function easeInOut(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
  }

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x
  }

  var BASE_LOW = { x: BASE_PAD.x, y: LANDED_Y, z: BASE_PAD.z }
  var BASE_HIGH = { x: BASE_PAD.x, y: CRUISE_Y, z: BASE_PAD.z }
  var CLIENT_HIGH = { x: CLIENT_PAD.x, y: CRUISE_Y, z: CLIENT_PAD.z }
  var CLIENT_LOW = { x: CLIENT_PAD.x, y: HOVER_Y, z: CLIENT_PAD.z }

  // поза дрона внутри фазы: 0 — начало, 1 — конец
  function poseInPhase(id, local, plan) {
    var p = easeInOut(local)

    if (id === 'climb') return lerp3(BASE_LOW, BASE_HIGH, p)
    if (id === 'cruise') return lerp3(BASE_HIGH, CLIENT_HIGH, p)
    if (id === 'descend') return lerp3(CLIENT_HIGH, CLIENT_LOW, p)
    if (id === 'drop') return { x: CLIENT_PAD.x, y: HOVER_Y, z: CLIENT_PAD.z }
    if (id === 'climbBack') return lerp3(CLIENT_LOW, CLIENT_HIGH, p)
    if (id === 'return') return lerp3(CLIENT_HIGH, BASE_HIGH, p)
    if (id === 'land') return lerp3(BASE_HIGH, BASE_LOW, p)

    // preflight / shutdown — дрон стоит на базовой площадке
    return { x: BASE_LOW.x, y: BASE_LOW.y, z: BASE_LOW.z }
  }

  /* ------------------------------------------------------------------ */
  /* рейс: решение + лента шагов + фазы                                */
  /* ------------------------------------------------------------------ */

  function build(state, crocks) {
    var env = readEnv(state)
    var pad = padFor(env, crocks)
    var need = fuelNeed(env, crocks)
    var decision = clearance(env, crocks)
    var verdict = verdictText(decision)
    var cleared = decision.either(
      function () {
        return false
      },
      function () {
        return true
      }
    )

    var steps = [
      {
        code: 'padFor("' + env.address + '")',
        value: pad.toString(),
        expect: EXPECT_PAD[env.address],
        note: env.address in PADS
          ? 'адрес нашёлся в базе площадок'
          : '`Maybe` вернул `Nothing`: такого адреса в базе нет'
      },
      {
        code: 'fuelReader.runWith(env)',
        value: String(need),
        expect: String(expectFuel(env)),
        note: env.distance
          ? '`Reader`: одна функция расхода, окружение — ветер ' + env.wind +
            ' м/с, вес ' + env.payload + ' кг, дистанция ' + env.distance + ' м'
          : 'маршрута нет (адрес вне зоны) — считать нечего, расход 0'
      },
      {
        code: 'checkPayload(' + env.payload + ')',
        value: checkPayload(env.payload, crocks).toString(),
        expect: EXPECT_PAYLOAD[String(env.payload)],
        note: 'перегруз — реальная причина отказа, а не «что-то пошло не так»'
      },
      {
        code: 'checkWind(' + env.wind + ')',
        value: checkWind(env.wind, crocks).toString(),
        expect: EXPECT_WIND[String(env.wind)],
        note: 'сильный ветер диспетчер не пропускает'
      },
      {
        code: 'checkBattery(' + env.battery + ', ' + need + ')',
        value: checkBattery(env.battery, need, crocks).toString(),
        expect: expectBattery(env.battery, need),
        note: 'после рейса должен остаться резерв ' + LIMITS.reserve + '%'
      },
      {
        code: 'clearance(env)',
        value: verdict,
        expect: expectVerdict(env),
        note: 'вся цепочка `Either`: первый отказ останавливает решение'
      }
    ]

    var source = cleared ? FLIGHT : GROUNDED
    var airborne = source.reduce(function (sum, phase) {
      return sum + (phase.air ? phase.share : 0)
    }, 0)

    var phases = source.map(function (phase) {
      return {
        id: phase.id,
        share: phase.share,
        air: phase.air,
        burn: phase.air && airborne ? phase.share / airborne : 0
      }
    })

    var longest = decision.either(
      function (reason) {
        return reason
      },
      function (plan) {
        return plan.summary
      }
    )

    return {
      env: env,
      cleared: cleared,
      verdict: verdict,
      reason: cleared ? null : longest,
      pad: pad.option(null),
      distance: env.distance,
      need: need,
      drift: env.wind * 0.045,
      phases: phases,
      steps: steps,
      layout: {
        base: { x: BASE_PAD.x, z: BASE_PAD.z },
        client: { x: CLIENT_PAD.x, z: CLIENT_PAD.z },
        cruiseY: CRUISE_Y,
        landedY: LANDED_Y,
        hoverY: HOVER_Y,
        pkgHang: PKG_HANG,
        pkgDropY: PKG_DROP_Y
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* кадр полёта: State ведёт дрон по фазам и считает заряд              */
  /* ------------------------------------------------------------------ */

  function propsSpeed(active, cleared) {
    if (!cleared) {
      if (active.id === 'preflight') return clamp01(active.local / 0.4)
      return clamp01(1 - active.local)
    }

    if (active.id === 'land' && active.local > 0.6) {
      return clamp01(1 - (active.local - 0.6) / 0.4)
    }

    return 1
  }

  function frameAt(model, crocks, t) {
    var State = crocks.State
    var Pair = crocks.Pair
    var Maybe = crocks.Maybe

    var time = clamp01(t)

    // State: часы, координаты и заряд тянем через все фазы полёта
    var sim = model.phases.reduce(function (acc, phase) {
      return acc.chain(function (seen) {
        return State(function (cursor) {
          var local = clamp01((time - cursor.clock) / phase.share)
          var pose = poseInPhase(phase.id, local, model)
          var battery = cursor.battery - phase.burn * model.need * local

          return Pair(
            seen.concat([
              {
                id: phase.id,
                start: cursor.clock,
                local: local,
                done: time >= cursor.clock + phase.share,
                x: pose.x,
                y: pose.y,
                z: pose.z,
                battery: battery
              }
            ]),
            {
              clock: cursor.clock + phase.share,
              x: pose.x,
              y: pose.y,
              z: pose.z,
              battery: battery
            }
          )
        })
      })
    }, State.of([]))

    var walked = sim.runWith({
      clock: 0,
      x: BASE_PAD.x,
      y: LANDED_Y,
      z: BASE_PAD.z,
      battery: model.env.battery
    })

    var entries = walked.fst()
    var cursor = walked.snd()

    // активная фаза — последняя, которая уже началась
    var active = entries[0]

    entries.forEach(function (entry) {
      if (time >= entry.start) active = entry
    })

    var drop = null

    entries.forEach(function (entry) {
      if (entry.id === 'drop') drop = entry
    })

    // ветер сносит дрон на маршруте
    var onRoute = model.cleared && (active.id === 'cruise' || active.id === 'return')
    var drift = onRoute ? model.drift * Math.sin(active.local * Math.PI) : 0

    var drone = {
      x: active.x + drift,
      y: active.y,
      z: active.z,
      tilt: (model.env.wind / 12) * 0.22 + (model.cleared ? 0.08 : 0),
      yaw: active.id === 'return' ? Math.PI : 0,
      props: propsSpeed(active, model.cleared),
      beacon: model.cleared ? 'active' : 'fail'
    }

    // Maybe: лежит ли ещё груз на борту (после сброса — ничего)
    var pkg = Maybe.Just({ x: drone.x, y: drone.y - PKG_HANG, z: drone.z })

    if (model.cleared && drop) {
      var released = drop.local >= 0.5

      pkg = pkg.chain(function (pose) {
        return released ? Maybe.Nothing() : Maybe.Just(pose)
      })
    }

    // посылка на площадке клиента: падает и остаётся лежать
    var dropProgress = drop ? clamp01((drop.local - 0.5) / 0.5) : 0
    var delivered = {
      visible: dropProgress > 0,
      progress: dropProgress,
      x: CLIENT_PAD.x,
      y: lerp(HOVER_Y - PKG_HANG, PKG_DROP_Y, easeInOut(dropProgress)),
      z: CLIENT_PAD.z
    }

    var landed = model.cleared ? time >= 1 : active.local >= 0.6
    var beacon = !model.cleared ? 'fail' : landed ? 'ok' : 'active'

    return {
      t: time,
      cleared: model.cleared,
      phase: active.id,
      phaseLocal: active.local,
      status: model.cleared ? STATUS[active.id] : 'вылет отменён диспетчером',
      beacon: beacon,
      landed: landed,
      drone: drone,
      battery: Math.max(0, active.battery),
      batteryLow: active.battery < 25,
      need: model.need,
      pkg: pkg,
      delivered: delivered,
      reason: model.reason,
      verdict: model.verdict,
      hover: !model.cleared && active.id === 'preflight'
    }
  }

  /* ------------------------------------------------------------------ */
  /* сцена для страницы                                                 */
  /* ------------------------------------------------------------------ */

  var scene = {
    id: 'drone',
    title: 'Доставка дроном: диспетчер на crocks',
    idea:
      'Реальная служба доставки: заявка проходит предполётные проверки, и только ' +
      'потом дрон летит. `Maybe` ищет адрес в базе площадок, `Reader` считает ' +
      'расход заряда под конкретные условия, `Either` даёт решение с причиной ' +
      'отказа, а `State` ведёт сам полёт — фазы, координаты, заряд.',
    hint:
      'Крути вес, ветер, заряд и адрес: диспетчер каждый раз решает заново. ' +
      'Отказ — это не авария, а нормальный ответ `Left` с понятной причиной, ' +
      'и дрон просто остаётся на базе.',
    controls: [
      {
        id: 'payload',
        label: 'вес посылки',
        type: 'chips',
        value: '0.8',
        options: [
          { value: '0.8', label: '0.8 кг' },
          { value: '1.6', label: '1.6 кг' },
          { value: '2.4', label: '2.4 кг' },
          { value: '3.4', label: '3.4 кг' }
        ]
      },
      {
        id: 'wind',
        label: 'ветер',
        type: 'chips',
        value: '6',
        options: [
          { value: '0', label: 'штиль' },
          { value: '6', label: '6 м/с' },
          { value: '12', label: '12 м/с' }
        ]
      },
      {
        id: 'battery',
        label: 'заряд',
        type: 'chips',
        value: '55',
        options: [
          { value: '100', label: '100%' },
          { value: '55', label: '55%' },
          { value: '30', label: '30%' }
        ]
      },
      {
        id: 'address',
        label: 'адрес',
        type: 'chips',
        value: 'Лесная 7',
        options: [
          { value: 'Лесная 7', label: 'Лесная 7' },
          { value: 'Порт 12', label: 'Порт 12' }
        ]
      },
      {
        id: 'speed',
        label: 'скорость показа',
        type: 'range',
        value: 1,
        min: 0.5,
        max: 2,
        step: 0.5,
        samples: [0.5, 1, 2]
      }
    ],
    build: build,
    frameAt: frameAt,
    limits: LIMITS
  }

  root.DRONE_DELIVERY = {
    scene: scene,
    build: build,
    frameAt: frameAt,
    LIMITS: LIMITS,
    PADS: PADS
  }
})(typeof window !== 'undefined' ? window : globalThis)
