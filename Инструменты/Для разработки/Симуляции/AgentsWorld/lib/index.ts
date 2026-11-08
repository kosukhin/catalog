/**
 * Публичный API ядра мира.
 *
 * ```js
 * import { World } from './lib/index.ts';
 * import * as myAgent from './путь/к/агенту.ts';
 *
 * const world = new World(new Map([[myAgent, 4]]));
 * await world.run();
 * await world.stop();
 * ```
 *
 * Ядро не знает ни одного конкретного агента: снаружи приходит модуль агента,
 * который обязан экспортировать `type`, `moduleUrl` и `createAgent` — контракт
 * `AgentPlugin` (`lib/agentPlugin.ts`). Кто именно подключён, решает приложение.
 *
 * Типы акторов (`Actor`, `ActorContext`, `AbstractActor`) лежат в `lib/actor.ts`:
 * нужны только тем, кто пишет своего агента.
 */

export { World, type WorldOptions } from './world.ts';
export { createMessage, isMessage, type ActorAssignment, type ActorId, type Message } from './protocol.ts';
export { type AgentPlugin } from './agentPlugin.ts';
export { type Population, type PopulationEntry } from './stats.ts';

