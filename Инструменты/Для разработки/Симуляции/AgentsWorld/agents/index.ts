/**
 * Все агенты, из которых собирается мир, — в одном месте.
 *
 * Это не реестр «тип → класс» (ядро про такое не знает), а просто список модулей
 * агентов: тот, кто собирает мир (приложение или скрипт), берёт их отсюда и решает,
 * кого и сколько запустить.
 *
 * ```js
 * import * as agents from '../agents/index.ts';
 *
 * new World(new Map([[agents.humanAgent, 3], [agents.tickAgent, { count: 1, options: { recipients } }]]));
 * ```
 *
 * Каждый элемент — модуль агента, то есть ровно то, что ждёт `Map` состава мира:
 * `type`, `moduleUrl`, `createAgent`. Поэтому новый агент подключается одной
 * строкой в составе мира и одной строкой здесь.
 *
 * `echoAgent` сюда не входит: это тестовый агент для проверки рантайма, в мире из
 * моделей он не участвует.
 */

export * as dayAgent from './dayAgent.ts';
export * as humanAgent from './humanAgent.ts';
export * as humanCatalogAgent from './humanCatalogAgent.ts';
export * as tickAgent from './tickAgent.ts';
