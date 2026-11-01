import crocks from 'crocks'
const { Arrow, Pair, fanout, first, second, both, isFunctor, isContravariant, isMonad } = crocks
const log = (l, v) => console.log(l.padEnd(44), String(v))
const attempt = (l, fn) => { try { log(l, fn()) } catch (e) { console.log(l.padEnd(44), 'THROW:', e.message) } }

log('Arrow typeof', typeof Arrow)
log('Arrow.id typeof', typeof Arrow.id)
log('crocks.arrow', typeof crocks.arrow)
log('crocks.arr', typeof crocks.arr)
log('crocks.then', typeof crocks.then)
log('crocks.fanout', typeof crocks.fanout)
log('crocks.first', typeof crocks.first)

const inc = Arrow(x => x + 1)
const dbl = Arrow(x => x * 2)
log('Arrow(inc).runWith(3)', inc.runWith(3))
log('toString', inc)
log('type', inc.type())
log('@@type', inc['@@type'])
log('map', inc.map(x => x * 10).runWith(3))
log('contramap', inc.contramap(x => x * 10).runWith(3))
log('promap', inc.promap(x => x * 2, x => x * 10).runWith(3))

log('inc.compose(dbl)(3)', inc.compose(dbl).runWith(3))
log('dbl.compose(inc)(3)', dbl.compose(inc).runWith(3))
log('id.compose(inc)(3)', Arrow.id().compose(inc).runWith(3))
log('inc.compose(id)(3)', inc.compose(Arrow.id()).runWith(3))

log('first', inc.first().runWith(Pair(1, 100)))
log('second', inc.second().runWith(Pair(1, 100)))
log('both', dbl.both().runWith(Pair(2, 3)))

log('fanout fn', fanout(x => x + 1, x => x * 2)(3))
const fan = fanout(inc, dbl)
log('fanout Arrow type', fan.type())
log('fanout Arrow run', fan.runWith(3))
log('pointfree first fn', first(x => x + 1)(Pair(1, 100)))
log('pointfree first Arrow', first(inc).runWith(Pair(1, 100)))
log('pointfree second fn', second(x => x + 1)(Pair(1, 100)))
log('pointfree both fn', both(x => x * 2)(Pair(2, 3)))

log('isFunctor', isFunctor(inc))
log('isContravariant', isContravariant(inc))
log('isMonad', isMonad(inc))
log('chain?', typeof inc.chain)
log('ap?', typeof inc.ap)

attempt('Arrow(42)', () => Arrow(42))
attempt('compose non-Arrow', () => inc.compose(42))
attempt('first non-Pair', () => inc.first().runWith(42))
attempt('first(null)', () => first(null))
