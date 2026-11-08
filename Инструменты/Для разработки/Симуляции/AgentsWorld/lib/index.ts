/**
 * Публичный API проекта «AgentsWorld».
 *
 * Всё, что нужно снаружи, доступно отсюда:
 *
 * ```js
 * import { World, ECHO_AGENT_TYPE } from './lib/index.ts';
 *
 * const world = new World({ [ECHO_AGENT_TYPE]: 4 });
 * await world.run();
 * await world.stop();
 * ```
 *
 * Типы самих акторов (`Actor`, `ActorContext`, `AbstractActor`) лежат в
 * `lib/actor.ts`, потому что модуль импортов держим в пределе четырёх.
 */

export { World, type WorldOptions } from './world.ts';
export { AgentRegistry, createDefaultRegistry } from './registry.ts';
export { ECHO_AGENT_TYPE, EchoAgent, type EchoAgentOptions } from '../agents/echoAgent.ts';
export { createMessage, isMessage, type ActorAssignment, type ActorId, type Message } from './protocol.ts';
