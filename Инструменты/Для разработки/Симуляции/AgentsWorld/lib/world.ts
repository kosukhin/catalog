import { createMessage } from './protocol/message.ts';
import { WORLD_ID } from './protocol/names.ts';
import type { ActorId, Message } from './protocol/message.ts';
import type { ActorAssignment, WorkerEvent } from './protocol/worker.ts';
import { normalizePopulation, summarizePopulation, type Population } from './stats.ts';
import { ThreadPool } from './threadPool.ts';
import { PendingReplies } from './world/pendingReplies.ts';
import { assignRoutes } from './world/routes.ts';
import { waitFor } from './world/waitFor.ts';
import * as roster from './rosterAgent.ts';

export interface WorldOptions {
    readonly threadPoolSize?: number;
    readonly print?: (line: string) => void;
}

interface WorldStatus {
    readonly assignments: readonly ActorAssignment[];
    readonly roster: ActorAssignment;
    readonly print: (line: string) => void;
    readonly threadPoolSize: number | undefined;
    readonly replies: PendingReplies;
    readonly routes: Map<ActorId, number>;
    readonly readyThreads: Set<number>;
    readonly doneThreads: Set<number>;
    readyWaiter: (() => void) | null;
    doneWaiter: (() => void) | null;
    pool: ThreadPool | null;
    running: boolean;
}


export class World {
    readonly #status: WorldStatus;

    constructor(population: Population, options: WorldOptions = {}) {
        this.#status = {
            assignments: normalizePopulation(population),
            roster: { id: roster.ROSTER_AGENT_ID, type: roster.type, moduleUrl: roster.moduleUrl, options: {} },
            print: options.print ?? ((line: string): void => console.log(line)),
            threadPoolSize: options.threadPoolSize,
            replies: new PendingReplies(),
            routes: new Map<ActorId, number>(),
            readyThreads: new Set<number>(),
            doneThreads: new Set<number>(),
            readyWaiter: null,
            doneWaiter: null,
            pool: null,
            running: false,
        };
    }

    state(): {
        readonly running: boolean;
        readonly threadCount: number;
        readonly actors: readonly ActorAssignment[];
        readonly population: Readonly<Record<string, number>>;
    } {
        return {
            running: this.#status.running,
            threadCount: new Set(this.#status.routes.values()).size,
            actors: this.#status.assignments,
            population: summarizePopulation(this.#status.assignments),
        };
    }


    async run(): Promise<void> {
        if (this.#status.running) {
            throw new Error('мир уже запущен');
        }
        const pool = new ThreadPool({
            size: this.#status.threadPoolSize,
            maxWorkers: this.#status.assignments.length,
            onEvent: (event: WorkerEvent, threadIndex: number): void => {
                this.#onEvent(event, threadIndex);
            },
            onWorkerError: (threadIndex: number, error: Error): void => {
                this.#status.print(`[поток ${threadIndex}] сбой воркера: ${error.message}`);
            },
        });
        this.#status.pool = pool;
        this.#status.running = true;

        const plan = assignRoutes([this.#status.roster, ...this.#status.assignments], pool.report().size);
        for (const [id, threadIndex] of plan.routes) {
            this.#status.routes.set(id, threadIndex);
        }

        const ready = waitFor(this.#status.readyThreads, plan.perThread.length, (waiter) => {
            this.#status.readyWaiter = waiter;
        });
        plan.perThread.forEach((actors, threadIndex) => {
            pool.post(threadIndex, { kind: 'start', actors });
        });
        await ready;
        this.#publishRoster();
    }

    async stop(): Promise<void> {
        const pool = this.#status.pool;
        if (!this.#status.running || !pool) {
            return;
        }
        const done = waitFor(this.#status.doneThreads, pool.report().size, (waiter) => {
            this.#status.doneWaiter = waiter;
        });
        pool.postAll({ kind: 'stop' });
        await done;
        await pool.terminate();
        this.#status.pool = null;
        this.#status.running = false;
        this.#status.replies.drop(new Error('мир остановлен'));
    }

    send(from: ActorId, to: ActorId, message: Message): void {
        const threadIndex = this.#status.routes.get(to);
        if (threadIndex === undefined) {
            this.#status.print(`[мир] нет агента с идентификатором ${to}`);
            return;
        }
        this.#status.pool?.post(threadIndex, { kind: 'deliver', from, to, message });
    }

    ask(to: ActorId, message: Message, timeoutMs = 1000): Promise<Message> {
        if (!this.#status.routes.has(to)) {
            return Promise.reject(new Error(`нет агента с идентификатором ${to}`));
        }
        const reply = this.#status.replies.add(to, timeoutMs);
        this.send(WORLD_ID, to, message);
        return reply;
    }


    #publishRoster(): void {
        const agents = this.#status.assignments.map(({ id, type }) => ({ id, type }));
        this.send(WORLD_ID, roster.ROSTER_AGENT_ID, createMessage(roster.ROSTER_SNAPSHOT, { agents }));
    }

    #onEvent(event: WorkerEvent, threadIndex: number): void {
        if (event.kind === 'ready') {
            this.#status.readyThreads.add(threadIndex);
            this.#status.readyWaiter?.();
            return;
        }
        if (event.kind === 'done') {
            this.#status.doneThreads.add(threadIndex);
            this.#status.doneWaiter?.();
            return;
        }
        if (event.kind === 'deliver') {
            if (event.to === WORLD_ID) {
                if (!this.#status.replies.accept(event.from, event.message)) {
                    this.#status.print(`[мир] сообщение от ${event.from}: ${event.message.type}`);
                }
                return;
            }
            this.send(event.from, event.to, event.message);
            return;
        }
        if (event.kind === 'log') {
            this.#status.print(`[${event.actorId} · поток ${event.threadId}] ${event.text}`);
            return;
        }
        const who = event.actorId === null ? 'мир' : event.actorId;
        this.#status.print(`[${who} · ошибка] ${event.text}`);
    }
}

