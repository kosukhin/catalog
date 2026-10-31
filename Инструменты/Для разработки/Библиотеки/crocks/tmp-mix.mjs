import crocks from 'crocks'
const { Reader, ReaderT, Maybe, Either, getProp, maybeToEither, eitherToMaybe } = crocks
const { Just, Nothing } = Maybe
const { Left, Right } = Either
const log = (l, v) => console.log(l.padEnd(46), String(v))

// 1) Reader с внутренним Maybe-конвейером — без ReaderT
const profile = id => Reader(env =>
  getProp(id, env.users)
    .chain(user => getProp('city', user))
    .map(city => city.toUpperCase())
)
log('Reader(env => Maybe-конвейер)', profile(1).runWith({ users: { 1: { city: 'Москва' } } }))
log('Reader(env => Maybe-конвейер) miss', profile(2).runWith({ users: {} }))

// 2) ReaderT(Maybe) фиксирует M
const MaybeReader = ReaderT(Maybe)
const findUser = id => MaybeReader(env => getProp(id, env.users))
log('ReaderT(Maybe)', findUser(1).runWith({ users: { 1: { city: 'Москва' } } }))
try {
  findUser(1).chain(() => Right(1)).runWith({ users: { 1: {} } })
} catch (e) { log('смешали Maybe и Either', e.name + ': ' + e.message) }

// 3) смена монады: преобразование на границе
log('maybeToEither Just', maybeToEither('нет города')(Just('Москва')))
log('maybeToEither Nothing', maybeToEither('нет города')(Nothing()))
log('eitherToMaybe Left', eitherToMaybe(Left('нет города')))
log('eitherToMaybe Right', eitherToMaybe(Right('Москва')))

// 4) функция возвращает Either вместо Maybe — меняем только границу
const EitherReader = ReaderT(Either)
const getCityEither = user => maybeToEither('нет города')(getProp('city', user))
log('ReaderT(Either) с адаптером',
  EitherReader(env => getProp(1, env.users))
    .chain(EitherReader.liftFn(getCityEither))
    .runWith({ users: { 1: {} } }))
