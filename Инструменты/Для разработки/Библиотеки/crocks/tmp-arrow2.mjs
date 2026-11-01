import crocks from 'crocks'
const { Arrow, Pair, fanout } = crocks
const log = (l, v) => console.log(l.padEnd(40), String(v))

log('Arrow.id().runWith(5)', Arrow.id().runWith(5))
log('Arrow.of', typeof Arrow.of)
log('Arrow.chain', typeof Arrow.chain)

const parse = Arrow(s => Number(s))
const double = Arrow(n => n * 2)
const format = Arrow(n => `result: ${n}`)
const program = parse.compose(double).compose(format)
log('pipeline', program.runWith('21'))

const fromInput = program.promap(o => o.value, s => ({ message: s }))
log('promap object', JSON.stringify(fromInput.runWith({ value: '21' })))

const stats = fanout(
  Arrow(xs => xs.length),
  Arrow(xs => xs.reduce((a, b) => a + b, 0))
)
log('stats', stats.runWith([1, 2, 3]))

const split = fanout(Arrow(u => u.name), Arrow(u => u.age))
log('split', split.runWith({ name: 'Ivan', age: 20 }))

const upper = Arrow(s => s.toUpperCase())
const nameOf = upper.promap(u => u.name, s => `name: ${s}`)
log('upper promap', nameOf.runWith({ name: 'ivan' }))

log('fanout functions', fanout(x => x + 1, x => x * 2)(3))
log('Arrow type of fanout', fanout(parse, double).type())
