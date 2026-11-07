/* ==========================================================================
   3D-сцена доставки дроном (three.js).
   --------------------------------------------------------------------------
   Своей логики здесь нет: каждый кадр берём у assets/drone-model.js готовое
   описание (позиция дрона, заряд, груз в Maybe, доставка, причина отказа)
   и переводим его в меши, цвета и прозрачности.

   Библиотеки грузятся как у остальных демо: сначала локальная сборка из
   node_modules, потом CDN. three.js — r149 (последняя версия с UMD-сборкой),
   поэтому страница работает двойным кликом из файла, без сборщика.

   Проверка семантики: npm run check:drone
   ========================================================================== */

;(function (root) {
  'use strict'

  var CROCKS_VERSION = '0.12.4'
  var THREE_VERSION = '0.149.0'
  var THREE_RELEASE = 'r149'

  var CROCKS_SOURCES = [
    '../node_modules/crocks/dist/crocks.min.js',
    'https://unpkg.com/crocks@' + CROCKS_VERSION + '/dist/crocks.min.js'
  ]

  var THREE_SOURCES = [
    '../node_modules/three/build/three.min.js',
    'https://unpkg.com/three@' + THREE_VERSION + '/build/three.min.js'
  ]

  var BASE_DURATION = 9 // секунд на один рейс при ×1
  var HOLD = 1.6 // пауза в конце

  var PALETTE = {
    bg: 0x070c16,
    ground: 0x0a1220,
    grid: 0x16233a,
    gridSoft: 0x101a2b,
    body: 0x18243a,
    accent: 0x38bdf8,
    client: 0xf59e0b,
    fail: 0xf43f5e,
    ok: 0x34d399
  }

  var dom = {}
  var crocks = null
  var THREE = null

  /* ------------------------------------------------------------------ */
  /* загрузка библиотек                                                 */
  /* ------------------------------------------------------------------ */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = function () {
        resolve(src)
      }
      script.onerror = function () {
        reject(new Error('не удалось загрузить ' + src))
      }
      document.head.appendChild(script)
    })
  }

  function loadFirst(sources) {
    return sources.reduce(function (chain, src) {
      return chain.catch(function () {
        return loadScript(src)
      })
    }, Promise.reject(new Error('нет источников')))
  }

  function reducedMotion() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }

  /* ------------------------------------------------------------------ */
  /* текст в 3D                                                         */
  /* ------------------------------------------------------------------ */

  function makeLabel(options) {
    var opts = options || {}
    var canvas = document.createElement('canvas')
    canvas.width = opts.width || 640
    canvas.height = opts.height || 160

    var ctx = canvas.getContext('2d')
    var texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    if ('encoding' in texture) texture.encoding = THREE.sRGBEncoding

    var material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    })

    var sprite = new THREE.Sprite(material)
    var worldWidth = opts.worldWidth || 2.6
    sprite.scale.set(worldWidth, (worldWidth * canvas.height) / canvas.width, 1)
    sprite.renderOrder = 10

    var family = opts.family || 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    var weight = opts.weight || '600'
    var baseSize = opts.fontSize || 60
    var lastText = null
    var lastColor = null

    function paint(text, color) {
      if (text === lastText && color === lastColor) return

      lastText = text
      lastColor = color
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      sprite.visible = !!text

      if (!text) {
        texture.needsUpdate = true
        return
      }

      var size = baseSize
      ctx.font = weight + ' ' + size + 'px ' + family

      var measured = ctx.measureText(text).width
      var max = canvas.width - 30

      if (measured > max) {
        size = Math.max(24, Math.floor((size * max) / measured))
        ctx.font = weight + ' ' + size + 'px ' + family
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = color || opts.color || '#cbd5e1'
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = opts.glow === false ? 0 : 16
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
      ctx.shadowBlur = 0
      texture.needsUpdate = true
    }

    return {
      sprite: sprite,
      set: function (text, color) {
        paint(text == null ? null : String(text), color || null)
      }
    }
  }

  function applyQuery(state, controls) {
    var search = root.location && root.location.search ? root.location.search.slice(1) : ''
    if (!search) return

    search.split('&').forEach(function (pair) {
      var parts = pair.split('=')
      var id = decodeURIComponent(parts[0] || '')
      var raw = decodeURIComponent(parts[1] || '')

      if (!id) return

      var control = (controls || []).filter(function (item) {
        return item.id === id
      })[0]

      if (!control) return

      if (control.type === 'chips' || control.type === 'select') {
        var known = (control.options || []).some(function (option) {
          return String(option.value) === raw
        })
        if (known) state[id] = raw
        return
      }

      if (control.type === 'range') {
        var number = Number(raw)
        if (!Number.isNaN(number)) state[id] = number
      }
    })
  }

  function queryValue(name) {
    var search = root.location && root.location.search ? root.location.search.slice(1) : ''
    if (!search) return null

    var pairs = search.split('&')

    for (var i = 0; i < pairs.length; i += 1) {
      var parts = pairs[i].split('=')
      if (decodeURIComponent(parts[0] || '') !== name) continue

      var number = Number(decodeURIComponent(parts[1] || ''))
      return Number.isNaN(number) ? null : number
    }

    return null
  }

  /* ------------------------------------------------------------------ */
  /* вспомогательные материалы                                          */
  /* ------------------------------------------------------------------ */

  function makeHalo() {
    var canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    var ctx = canvas.getContext('2d')
    var gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.35, 'rgba(150,210,255,0.3)')
    gradient.addColorStop(1, 'rgba(80,140,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)

    var texture = new THREE.CanvasTexture(canvas)
    if ('encoding' in texture) texture.encoding = THREE.sRGBEncoding
    return texture
  }

  function makeStars() {
    var count = 260
    var positions = new Float32Array(count * 3)

    for (var i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 80
      positions[i * 3 + 1] = 6 + Math.random() * 22
      positions[i * 3 + 2] = -14 - Math.random() * 30
    }

    var geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.12,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      })
    )
  }

  // город: детерминированные кварталы, чтобы сцена всегда выглядела одинаково
  function cityBlocks(layout) {
    var group = new THREE.Group()
    var seed = 7

    function random() {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    var material = new THREE.MeshStandardMaterial({
      color: 0x0b1422,
      metalness: 0.35,
      roughness: 0.85,
      emissive: 0x050a12,
      emissiveIntensity: 0.25
    })

    var rows = [-8.6, -6.4, 6.4, 8.6]

    rows.forEach(function (z) {
      for (var x = -10; x <= 11; x += 2.8) {
        var height = 0.5 + random() * 1.5
        var width = 1 + random() * 0.5
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), material.clone())

        mesh.position.set(x + (random() - 0.5) * 0.5, height / 2, z + (random() - 0.5) * 0.6)
        mesh.material.emissiveIntensity = 0.15 + random() * 0.3
        group.add(mesh)
      }
    })

    // ближние к маршруту низкие коробки, чтобы лента «читалась»
    for (var i = 0; i < 6; i += 1) {
      var small = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25 + random() * 0.35, 0.6), material.clone())
      small.position.set(-6 + i * 2.4, 0.18, 4.2 + (random() - 0.5))
      group.add(small)
    }

    return group
  }

  /* ------------------------------------------------------------------ */
  /* сцена                                                             */
  /* ------------------------------------------------------------------ */

  function createStage(initialModel) {
    var host = dom.host
    var model = initialModel
    var layout = model.layout

    var renderer

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch (error) {
      throw new Error('WebGL недоступен: ' + error.message)
    }

    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2))
    renderer.setSize(host.clientWidth || 720, host.clientHeight || 420, false)
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding
    renderer.setClearColor(PALETTE.bg, 1)
    host.appendChild(renderer.domElement)

    var scene = new THREE.Scene()
    scene.fog = new THREE.Fog(PALETTE.bg, 30, 54)

    var camera = new THREE.PerspectiveCamera(44, 1, 0.1, 180)

    /* земля и город */

    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 46),
      new THREE.MeshStandardMaterial({ color: 0x060b14, roughness: 0.95, metalness: 0.05 })
    )
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)

    var grid = new THREE.GridHelper(64, 32, PALETTE.grid, PALETTE.gridSoft)
    grid.position.y = 0.01
    grid.material.transparent = true
    grid.material.opacity = 0.2
    scene.add(grid)

    scene.add(cityBlocks(layout))
    scene.add(makeStars())

    /* свет */

    scene.add(new THREE.HemisphereLight(0x4c6f9e, 0x05070c, 0.55))

    var keyLight = new THREE.DirectionalLight(0xffffff, 0.7)
    keyLight.position.set(-6, 12, 9)
    scene.add(keyLight)

    var rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5)
    rimLight.position.set(8, 6, -8)
    scene.add(rimLight)

    var droneLight = new THREE.PointLight(PALETTE.accent, 1.4, 12)
    scene.add(droneLight)

    /* площадки */

    function makePad(options) {
      var group = new THREE.Group()
      group.position.set(options.x, 0.02, options.z)

      var disc = new THREE.Mesh(
        new THREE.CylinderGeometry(options.radius, options.radius, 0.08, 48),
        new THREE.MeshStandardMaterial({
          color: 0x0e1728,
          metalness: 0.75,
          roughness: 0.35,
          emissive: options.color,
          emissiveIntensity: 0.55
        })
      )
      disc.position.y = 0.04
      group.add(disc)

      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(options.radius, 0.055, 12, 64),
        new THREE.MeshStandardMaterial({
          color: 0x0b1220,
          emissive: options.color,
          emissiveIntensity: 1,
          metalness: 0.4,
          roughness: 0.4
        })
      )
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.08
      group.add(ring)

      var label = makeLabel({ worldWidth: 2.7, color: options.labelColor || '#93c5fd', fontSize: 50 })
      label.sprite.position.set(0, 1.15, 0)
      label.set(options.label, options.labelColor || '#93c5fd')
      group.add(label.sprite)

      return { group: group, disc: disc, ring: ring, label: label }
    }

    var basePad = makePad({
      x: layout.base.x,
      z: layout.base.z,
      radius: 1.7,
      color: PALETTE.accent,
      label: 'БАЗА',
      labelColor: '#38bdf8'
    })
    scene.add(basePad.group)

    var clientPad = makePad({
      x: layout.client.x,
      z: layout.client.z,
      radius: 1.5,
      color: PALETTE.client,
      label: 'P-07',
      labelColor: '#fbbf24'
    })
    scene.add(clientPad.group)

    // маршрут: пунктир по земле, виден только когда вылет разрешён
    var routePoints = []

    for (var step = 0; step <= 24; step += 1) {
      var k = step / 24
      routePoints.push(
        new THREE.Vector3(
          layout.base.x + (layout.client.x - layout.base.x) * k,
          0.09,
          layout.base.z + (layout.client.z - layout.base.z) * k
        )
      )
    }

    var routeGeometry = new THREE.BufferGeometry().setFromPoints(routePoints)
    var route = new THREE.Line(
      routeGeometry,
      new THREE.LineDashedMaterial({ color: PALETTE.accent, dashSize: 0.45, gapSize: 0.35, transparent: true, opacity: 0.55 })
    )
    route.computeLineDistances()
    scene.add(route)

    /* дрон */

    var drone = new THREE.Group()
    drone.scale.setScalar(1.12)
    scene.add(drone)

    var bodyMaterial = new THREE.MeshStandardMaterial({
      color: PALETTE.body,
      metalness: 0.55,
      roughness: 0.35,
      emissive: 0x0d1a2c,
      emissiveIntensity: 0.6
    })
    var armMaterial = new THREE.MeshStandardMaterial({ color: 0x1a273d, metalness: 0.6, roughness: 0.4 })
    var rotorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b2942,
      metalness: 0.2,
      roughness: 0.7,
      transparent: true,
      opacity: 0.8
    })

    drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.92), bodyMaterial))

    var canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x21334d, metalness: 0.6, roughness: 0.25 })
    )
    canopy.position.y = 0.11
    drone.add(canopy)

    var strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: PALETTE.accent, emissiveIntensity: 1.3 })
    )
    strip.position.set(0, 0.16, -0.36)
    drone.add(strip)

    var rotors = []
    var corners = [
      [0.62, 0.62],
      [-0.62, 0.62],
      [0.62, -0.62],
      [-0.62, -0.62]
    ]

    corners.forEach(function (corner) {
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.1), armMaterial)
      arm.position.set(corner[0] * 0.5, 0, corner[1] * 0.5)
      arm.rotation.y = -Math.atan2(corner[1], corner[0])
      drone.add(arm)

      var hub = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), armMaterial)
      hub.position.set(corner[0], 0.06, corner[1])
      drone.add(hub)

      var rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 22), rotorMaterial)
      rotor.position.set(corner[0], 0.09, corner[1])
      drone.add(rotor)
      rotors.push(rotor)
    })

    ;[-0.34, 0.34].forEach(function (x) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), armMaterial)
      leg.position.set(x, -0.24, 0)
      drone.add(leg)

      var skid = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.78), armMaterial)
      skid.position.set(x, -0.36, 0)
      drone.add(skid)
    })

    var gimbal = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.7, roughness: 0.3 })
    )
    gimbal.position.set(0, -0.02, 0.42)
    drone.add(gimbal)

    var beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: PALETTE.accent, emissiveIntensity: 2 })
    )
    beacon.position.y = 0.34
    drone.add(beacon)

    var beaconLight = new THREE.PointLight(PALETTE.accent, 1.2, 6)
    beaconLight.position.y = 0.34
    drone.add(beaconLight)

    var batteryLabel = makeLabel({ worldWidth: 1.7, color: '#7dd3fc', fontSize: 54 })
    batteryLabel.sprite.position.set(0, 0.74, 0)
    drone.add(batteryLabel.sprite)

    /* груз и доставленная посылка */

    var pkgGeometry = new THREE.BoxGeometry(0.46, 0.4, 0.46)
    var pkgMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.85, metalness: 0.05 })
    var tapeMaterial = new THREE.MeshStandardMaterial({ color: 0x8f6c46, roughness: 0.9 })

    var pkg = new THREE.Group()
    pkg.add(new THREE.Mesh(pkgGeometry, pkgMaterial))
    var tape = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.1), tapeMaterial)
    tape.position.y = 0.2
    pkg.add(tape)
    scene.add(pkg)

    var deliveredPkg = new THREE.Group()
    deliveredPkg.add(new THREE.Mesh(pkgGeometry, pkgMaterial.clone()))
    var deliveredTape = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.1), tapeMaterial.clone())
    deliveredTape.position.y = 0.2
    deliveredPkg.add(deliveredTape)
    scene.add(deliveredPkg)

    /* ветер: короткие штрихи, летящие по маршруту */

    var WIND_COUNT = 40
    var windSeeds = []
    var windPositions = new Float32Array(WIND_COUNT * 6)

    for (var w = 0; w < WIND_COUNT; w += 1) {
      windSeeds.push({
        x: -16 + Math.random() * 32,
        y: 0.8 + Math.random() * 3.6,
        z: -5 + Math.random() * 10,
        length: 0.5 + Math.random() * 1.2
      })
    }

    var windGeometry = new THREE.BufferGeometry()
    windGeometry.setAttribute('position', new THREE.BufferAttribute(windPositions, 3))

    var windLines = new THREE.LineSegments(
      windGeometry,
      new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
    scene.add(windLines)

    /* подпись отказа над базой */

    var verdictLabel = makeLabel({ worldWidth: 4.4, color: '#f43f5e', fontSize: 46 })
    verdictLabel.sprite.position.set(layout.base.x, 2.1, layout.base.z)
    scene.add(verdictLabel.sprite)

    /* кадр: всё уже посчитано моделью, здесь только перенос в 3D */

    var rotorPhase = 0
    var lastWall = 0
    var cameraZ = 16

    function render(t, wall) {
      var frame = root.DRONE_DELIVERY.frameAt(model, crocks, t)
      var dt = Math.max(0, Math.min(0.1, wall - lastWall))
      lastWall = wall

      rotorPhase += dt * (4 + 52 * frame.drone.props)

      var bob = frame.drone.props > 0.05 ? Math.sin(wall * 18) * 0.009 * frame.drone.props : 0

      drone.position.set(frame.drone.x, frame.drone.y + bob, frame.drone.z)
      drone.rotation.z = -frame.drone.tilt
      drone.rotation.y = frame.drone.yaw + Math.sin(wall * 0.7) * 0.02

      rotors.forEach(function (rotor, index) {
        rotor.rotation.y = rotorPhase * (index % 2 === 0 ? 1 : -1)
        rotor.material.opacity = 0.22 + 0.6 * frame.drone.props
      })

      var beaconColor =
        frame.beacon === 'fail' ? PALETTE.fail : frame.beacon === 'ok' ? PALETTE.ok : PALETTE.accent

      beacon.material.emissive.setHex(beaconColor)
      beacon.material.emissiveIntensity = 1.3 + Math.sin(wall * 6) * 0.7
      beaconLight.color.setHex(beaconColor)
      droneLight.color.setHex(beaconColor)
      droneLight.position.set(frame.drone.x, frame.drone.y + 0.6, frame.drone.z)

      batteryLabel.set(
        Math.round(frame.battery) + '%',
        frame.batteryLow ? '#fb7185' : '#7dd3fc'
      )

      // Maybe: груз либо есть на борту, либо его уже нет
      var pose = frame.pkg.option(null)
      pkg.visible = !!pose

      if (pose) pkg.position.set(pose.x, pose.y, pose.z)

      deliveredPkg.visible = frame.delivered.visible

      if (frame.delivered.visible) {
        deliveredPkg.position.set(frame.delivered.x, frame.delivered.y, frame.delivered.z)
        deliveredPkg.rotation.y = frame.delivered.progress * 0.8
        deliveredPkg.scale.setScalar(0.88 + 0.12 * frame.delivered.progress)
      }

      basePad.ring.material.emissive.setHex(frame.cleared ? PALETTE.accent : PALETTE.fail)
      basePad.ring.material.emissiveIntensity = frame.landed && frame.cleared ? 1.7 : 0.85
      basePad.label.set('БАЗА', frame.cleared ? '#38bdf8' : '#fb7185')

      clientPad.ring.material.emissive.setHex(model.pad ? PALETTE.client : 0x334155)
      clientPad.ring.material.emissiveIntensity = frame.delivered.visible ? 1.5 : 0.55
      clientPad.label.set(model.pad ? model.pad : '?', model.pad ? '#fbbf24' : '#64748b')

      route.visible = !!model.pad
      route.material.opacity = frame.cleared ? 0.5 : 0.16

      verdictLabel.set(frame.cleared ? null : 'ВЫЛЕТ ОТМЕНЁН', '#fb7185')

      // ветер
      var wind = model.env.wind
      windLines.material.opacity = 0.03 + Math.min(1, wind / 12) * 0.28

      var positions = windGeometry.attributes.position.array

      for (var i = 0; i < windSeeds.length; i += 1) {
        var seed = windSeeds[i]
        var head = ((seed.x + wall * wind * 0.9 + 16) % 32 + 32) % 32 - 16

        positions[i * 6] = head
        positions[i * 6 + 1] = seed.y
        positions[i * 6 + 2] = seed.z
        positions[i * 6 + 3] = head - seed.length * (0.4 + wind / 18)
        positions[i * 6 + 4] = seed.y
        positions[i * 6 + 5] = seed.z
      }

      windGeometry.attributes.position.needsUpdate = true

      // камера чуть ведёт дрон и «дышит»
      camera.position.set(
        0.6 + Math.sin(wall * 0.21) * 0.5,
        10.4 + Math.sin(wall * 0.27) * 0.18,
        cameraZ
      )
      camera.lookAt(frame.drone.x * 0.14, 1.1, 0.6)

      renderer.render(scene, camera)
      return frame
    }

    function setModel(nextModel) {
      model = nextModel
      layout = model.layout
      resize()
    }

    function resize() {
      var width = Math.max(320, host.clientWidth || 720)
      var height = Math.max(260, host.clientHeight || 420)

      renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2))
      renderer.setSize(width, height, false)

      camera.aspect = width / height

      var span = Math.abs(layout.client.x - layout.base.x) + 7
      var halfFov = Math.tan((camera.fov * Math.PI) / 360)
      var fit = span / (2 * halfFov * Math.max(0.85, camera.aspect) * 0.95)

      cameraZ = Math.max(13, Math.min(30, fit))
      camera.updateProjectionMatrix()
    }

    resize()

    return {
      element: renderer.domElement,
      setModel: setModel,
      render: render,
      resize: resize
    }
  }

  /* ------------------------------------------------------------------ */
  /* страница                                                           */
  /* ------------------------------------------------------------------ */

  function setStatus(text) {
    if (dom.status) dom.status.textContent = text
  }

  function showError(message) {
    if (dom.host) {
      var note = document.createElement('p')
      note.className = 'vmsg vmsg--warn'
      note.textContent = message
      dom.host.appendChild(note)
    }

    setStatus('3D не запустился')
  }

  function clean(node) {
    while (node.firstChild) node.removeChild(node.firstChild)
  }

  function start() {
    var delivery = root.DRONE_DELIVERY

    return Promise.all([loadFirst(CROCKS_SOURCES), loadFirst(THREE_SOURCES)]).then(function () {
      crocks = root.crocks
      THREE = root.THREE

      if (!crocks || !delivery) throw new Error('crocks не загрузился: диспетчеру нечего считать')
      if (!THREE) throw new Error('three.js не загрузился: нечем рисовать')
      if (!root.Demo) throw new Error('движок демо (demo.js) не загрузился')

      runScene(delivery.scene, root.Demo)
    })
  }

  function runScene(spec, Demo) {
    var state = Demo.defaults(spec.controls)
    applyQuery(state, spec.controls)

    var model = spec.build(state, crocks)
    var stage = createStage(model)
    var clock = { elapsed: 0, last: 0, paused: false }
    var wall = 0
    var hudText = ''

    function renderSteps() {
      if (!dom.steps) return
      clean(dom.steps)
      Demo.steps(dom.steps, model.steps)
    }

    function updateHud(frame) {
      if (!dom.hud) return

      var text = [
        'фаза: ' + frame.status,
        'заряд: ' + Math.round(frame.battery) + '%',
        'груз: ' +
          (frame.pkg.option(null) ? 'на борту' : frame.delivered.visible ? 'доставлен' : '—'),
        model.cleared ? model.verdict : 'отказ: ' + model.reason
      ].join(' · ')

      if (text !== hudText) {
        hudText = text
        dom.hud.textContent = text
      }
    }

    function rebuild() {
      model = spec.build(state, crocks)
      stage.setModel(model)
      renderSteps()
      clock.elapsed = 0
      clock.last = 0
    }

    if (dom.controls) {
      clean(dom.controls)

      spec.controls.forEach(function (control) {
        dom.controls.appendChild(Demo.controls(control, state, rebuild))
      })
    }

    function updatePauseLabel() {
      if (!dom.pause) return
      dom.pause.textContent = clock.paused ? '▶ проиграть' : '❚❚ пауза'
      dom.pause.setAttribute('aria-pressed', String(clock.paused))
    }

    if (dom.pause) {
      dom.pause.addEventListener('click', function () {
        clock.paused = !clock.paused
        clock.last = 0
        updatePauseLabel()
      })
    }

    // кому анимация мешает — сразу видит финальный кадр
    if (reducedMotion()) {
      clock.paused = true
      clock.elapsed = BASE_DURATION
    }

    // ?t=0.7 — остановиться на моменте (удобно для ссылок и проверок)
    var frozen = queryValue('t')

    if (frozen != null) {
      clock.paused = true
      clock.elapsed = Math.max(0, Math.min(1, frozen)) * BASE_DURATION
    }

    updatePauseLabel()

    function tick(now) {
      var dt = clock.last ? Math.min(0.06, (now - clock.last) / 1000) : 0
      clock.last = now
      wall += dt

      if (!clock.paused && !document.hidden) clock.elapsed += dt * model.env.speed

      var cycle = BASE_DURATION + HOLD
      var local = clock.elapsed % cycle
      var t = Math.min(1, local / BASE_DURATION)

      updateHud(stage.render(t, wall))
      root.requestAnimationFrame(tick)
    }

    if (root.ResizeObserver) {
      new root.ResizeObserver(function () {
        stage.resize()
      }).observe(dom.host)
    } else {
      root.addEventListener('resize', function () {
        stage.resize()
      })
    }

    renderSteps()
    updateHud(stage.render(clock.elapsed >= BASE_DURATION ? 1 : 0, 0))
    root.requestAnimationFrame(tick)
  }

  function boot() {
    dom.host = document.querySelector('[data-drone-stage]')
    if (!dom.host) return

    dom.controls = document.querySelector('[data-drone-controls]')
    dom.steps = document.querySelector('[data-drone-steps]')
    dom.hud = document.querySelector('[data-drone-hud]')
    dom.status = document.querySelector('[data-drone-status]')
    dom.pause = document.querySelector('[data-drone-pause]')

    if (!root.DRONE_DELIVERY) {
      showError('Модель drone-model.js не загрузилась')
      return
    }

    if (root.Demo) root.Demo.status('loading')
    setStatus('загружаю crocks и three.js…')

    start()
      .then(function () {
        if (root.Demo) root.Demo.status('on')
        setStatus('crocks ' + CROCKS_VERSION + ' · three.js ' + THREE_RELEASE)
      })
      .catch(function (error) {
        if (root.Demo) root.Demo.status('off')
        showError(error.message)
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})(typeof window !== 'undefined' ? window : globalThis)
