/**
 * Снимок состояния мира для дашборда.
 *
 * Состояния агентов живут внутри потоков, поэтому «посмотреть» на них из главного
 * потока нельзя. Единственный способ — спросить: мир отправляет каждому актору
 * `status-request`, актор отвечает `status-report` (это умеет `AbstractActor`),
 * ответ приходит в мир и попадает в снимок.
 *
 * Один агент может не ответить: не запустился, завис или не успел за таймаут.
 * Такой агент попадает в снимок как `alive: false`, а не ломает весь дашборд —
 * поэтому опрос идёт через `Promise.all` с перехватом ошибок.
 *
 * Время мира спрашивается отдельно у `DayAgent` (адрес приходит из конфигурации),
 * чтобы дашборд показывал виртуальное время, а не время браузера.
 */

import { createMessage, STATUS_REQUEST, WORLD_ID, type ActorId, type Message, type StatusReport } from '../lib/protocol.ts';
import { TIME_REQUEST, type TimeReport } from '../agents/dayAgent.ts';

/** Минимально необходимое от мира: столько, сколько нужно снимку. */
export interface WorldQuery {
    readonly running: boolean;
    readonly threadCount: number;
    readonly actors: readonly { readonly id: ActorId; readonly type: string }[];
    ask(to: ActorId, message: Message, timeoutMs?: number): Promise<Message>;
}

/** Состояние одного агента в снимке. */
export interface AgentSnapshot {
    readonly id: ActorId;
    readonly type: string;
    /** Ответил ли агент на запрос состояния. */
    readonly alive: boolean;
    /** Подробности, которые агент рассказал о себе. */
    readonly details: Readonly<Record<string, unknown>>;
}

/** Полный снимок мира. */
export interface WorldSnapshot {
    readonly running: boolean;
    readonly threadCount: number;
    readonly total: number;
    readonly byType: Readonly<Record<string, number>>;
    readonly clock: TimeReport | null;
    readonly agents: readonly AgentSnapshot[];
}

/**
 * Опрашивает все агенты и собирает снимок.
 *
 * @param timeoutMs сколько ждать ответа от одного агента
 */
export async function takeSnapshot(world: WorldQuery, clockId: string, timeoutMs = 500): Promise<WorldSnapshot> {
    const agents = await Promise.all(world.actors.map((actor) => readAgent(world, actor, timeoutMs)));
    return {
        running: world.running,
        threadCount: world.threadCount,
        total: agents.length,
        byType: countByType(agents),
        clock: await readClock(world, clockId, timeoutMs),
        agents,
    };
}

/** Спрашивает состояние одного агента. */
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

/** Спрашивает у агента времени виртуальные часы мира. */
async function readClock(world: WorldQuery, clockId: string, timeoutMs: number): Promise<TimeReport | null> {
    try {
        const reply = await world.ask(clockId, createMessage(TIME_REQUEST, { replyTo: WORLD_ID }), timeoutMs);
        return (reply.payload as TimeReport | undefined) ?? null;
    } catch {
        return null;
    }
}

/** Считает агентов по типам. */
function countByType(agents: readonly AgentSnapshot[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const agent of agents) {
        counts[agent.type] = (counts[agent.type] ?? 0) + 1;
    }
    return counts;
}
