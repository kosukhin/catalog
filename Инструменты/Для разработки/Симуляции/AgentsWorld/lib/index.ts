/**
 * Публичный API проекта «AgentsWorld» — всё, что относится к ядру мира.
 *
 * ```js
 * import { World } from './lib/index.ts';
 * import { ECHO_AGENT_TYPE } from '../agents/echoAgent.ts';
 *
 * const world = new World({ [ECHO_AGENT_TYPE]: 4 });
 * await world.run();
 * await world.stop();
 * ```
 *
 * Агенты сюда не реэкспортируются: директория `agents/` живёт отдельно от кода
 * `lib/` и подключается напрямую. Реестр (`registry.ts`) при этом умеет находить
 * агентов из `agents/` — иначе мир не смог бы их создать по строковому типу.
 *
 * Типы самих акторов (`Actor`, `ActorContext`, `AbstractActor`) лежат в
 * `lib/actor.ts`, потому что модуль импортов держим в пределе четырёх.
 */

export { World, type WorldOptions } from './world.ts';
export { AgentRegistry, createDefaultRegistry } from './registry.ts';
export { createMessage, isMessage, type ActorAssignment, type ActorId, type Message } from './protocol.ts';
