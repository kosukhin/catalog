import crocks from 'crocks'
const { Maybe, Pred, Arrow, isFunctor, isContravariant, isProfunctor } = crocks
const { Just } = Maybe
const log = (l, v) => console.log(l.padEnd(44), String(v))
const attempt = (l, fn) => { try { log(l, fn()) } catch (e) { console.log(l.padEnd(44), 'THROW:', e.message) } }

log('Maybe map', Just(2).map(x => x * 2))
log('isFunctor(Just(2))', isFunctor(Just(2)))

const positive = Pred(x => x > 0)
log('Pred typeof', typeof positive)
log('Pred keys', Object.keys(positive).join(','))
log('Pred runWith(5)', positive.runWith(5))
log('Pred runWith(-5)', positive.runWith(-5))
log('Pred contramap length', positive.contramap(s => s.length).runWith('abc'))
log('Pred contramap length empty', positive.contramap(s => s.length).runWith(''))
log('isContravariant(Pred)', isContravariant(positive))
log('isFunctor(Pred)', isFunctor(positive))
log('isProfunctor(Pred)', isProfunctor(positive))

const inc = Arrow(x => x + 1)
log('Arrow promap', inc.promap(s => Number(s), n => n * 10).runWith('3'))
log('Arrow contramap', Arrow(s => s.length).contramap(n => String(n)).runWith(123))
log('isFunctor(Arrow)', isFunctor(inc))
log('isContravariant(Arrow)', isContravariant(inc))
log('isProfunctor(Arrow)', isProfunctor(inc))

attempt('Pred.chain', () => positive.chain)
