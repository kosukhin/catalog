import { createMessage, type ActorId, type Message } from '../lib/protocol/message.ts';
import { STATUS_REQUEST, WORLD_ID, type StatusReport } from '../lib/protocol/names.ts';
import { TIME_REQUEST, type TimeReport } from '../agents/dayAgent.ts';
import { PHYSICS_LIST, PHYSICS_STATE, type PhysicsState } from '../agents/physicsAgent.ts';

export interface WorldQuery {
    state(): {
        readonly running: boolean;
        readonly threadCount: number;
        readonly actors: readonly { readonly id: ActorId; readonly type: string }[];
    };
    ask(to: ActorId, message: Message, timeoutMs?: number): Promise<Message>;
}

export interface AgentSnapshot {
    readonly id: ActorId;
    readonly type: string;
    readonly alive: boolean;
    readonly details: Readonly<Record<string, unknown>>;
}

export interface WorldSnapshot {
    readonly running: boolean;
    readonly threadCount: number;
    readonly total: number;
    readonly byType: Readonly<Record<string, number>>;
    readonly clock: TimeReport | null;
    readonly agents: readonly AgentSnapshot[];
}

export async function takeSnapshot(world: WorldQuery, clockId: string, timeoutMs = 500): Promise<WorldSnapshot> {
    const plan = world.state();
    const agents = await Promise.all(plan.actors.map((actor) => readAgent(world, actor, timeoutMs)));
    return {
        running: plan.running,
        threadCount: plan.threadCount,
        total: agents.length,
        byType: countByType(agents),
        clock: await takeClock(world, clockId, timeoutMs),
        agents,
    };
}

async function readAgent(
    world: WorldQuery,
    actor: { readonly id: ActorId; readonly type: string },
    timeoutMs: number,
): Promise<AgentSnapshot> {
    try {
        const reply = await world.ask(actor.id, createMessage(STATUS_REQUEST, { replyTo: WORLD_ID }), timeoutMs);
        const report = reply.payload as StatusReport | undefined;
        return { id: actor.id, type: actor.type, alive: true, details: report?.details ?? {} };
    } catch {
        return { id: actor.id, type: actor.type, alive: false, details: {} };
    }
}

export async function takeClock(world: WorldQuery, clockId: string, timeoutMs = 500): Promise<TimeReport | null> {
    try {
        const reply = await world.ask(clockId, createMessage(TIME_REQUEST, { replyTo: WORLD_ID }), timeoutMs);
        return (reply.payload as TimeReport | undefined) ?? null;
    } catch {
        return null;
    }
}

function countByType(agents: readonly AgentSnapshot[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const agent of agents) {
        counts[agent.type] = (counts[agent.type] ?? 0) + 1;
    }
    return counts;
}

export async function takePhysics(world: WorldQuery, physicsId: string, timeoutMs = 500): Promise<PhysicsState> {
    const reply = await world.ask(physicsId, createMessage(PHYSICS_LIST, { replyTo: WORLD_ID }), timeoutMs);
    if (reply.type !== PHYSICS_STATE) {
        throw new Error(`агент ${physicsId} ответил «${reply.type}» вместо «${PHYSICS_STATE}»`);
    }
    return reply.payload as PhysicsState;
}
