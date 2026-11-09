import { WORLD_ID, type ActorAssignment, type ActorId, type Message, type WorkerEvent } from './protocol.ts';
import { normalizePopulation, summarizePopulation, type Population } from './stats.ts';
import { ThreadPool } from './threadPool.ts';

export interface WorldOptions {
    readonly threadPoolSize?: number;
    readonly print?: (line: string) => void;
}

export class World {
    readonly #assignments: ActorAssignment[];
    readonly #print: (line: string) => void;
    readonly #threadPoolSize: number | undefined;
    readonly #routes = new Map<ActorId, number>();
    readonly #readyThreads = new Set<number>();
    readonly #doneThreads = new Set<number>();
    #readyWaiter: (() => void) | null = null;
    #doneWaiter: (() => void) | null = null;
    #pool: ThreadPool | null = null;
    #running = false;
    readonly #pending = new Map<ActorId, { resolve: (message: Message) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

    constructor(population: Population, options: WorldOptions = {}) {
        this.#assignments = normalizePopulation(population);
        this.#print = options.print ?? ((line: string): void => console.log(line));
        this.#threadPoolSize = options.threadPoolSize;
    }

    get actors(): readonly ActorAssignment[] {
        return this.#assignments;
    }

    get population(): Record<string, number> {
        return summarizePopulation(this.#assignments);
    }

    get running(): boolean {
        return this.#running;
    }

    get threadCount(): number {
        return new Set(this.#routes.values()).size;
    }

    async run(): Promise<void> {
        if (this.#running) {
            throw new Error('мир уже запущен');
        }
        const total = this.#assignments.length;
        const pool = new ThreadPool({
            size: this.#threadPoolSize,
            maxWorkers: total,
            onEvent: (event: WorkerEvent, threadIndex: number): void => {
                this.#onEvent(event, threadIndex);
            },
            onWorkerError: (threadIndex: number, error: Error): void => {
                this.#print(`[поток ${threadIndex}] сбой воркера: ${error.message}`);
            },
        });
        this.#pool = pool;
        this.#running = true;

        const workerCount = pool.size;
        const perThread: ActorAssignment[][] = Array.from({ length: workerCount }, () => []);
        this.#assignments.forEach((assignment, index) => {
            const threadIndex = index % workerCount;
            this.#routes.set(assignment.id, threadIndex);
            perThread[threadIndex]?.push(assignment);
        });

        const ready = this.#waitFor(this.#readyThreads, workerCount, (waiter) => {
            this.#readyWaiter = waiter;
        });
        perThread.forEach((actors, threadIndex) => {
            pool.post(threadIndex, { kind: 'start', actors });
        });
        await ready;
    }

    async stop(): Promise<void> {
        const pool = this.#pool;
        if (!this.#running || !pool) {
            return;
        }
        const done = this.#waitFor(this.#doneThreads, pool.size, (waiter) => {
            this.#doneWaiter = waiter;
        });
        pool.postAll({ kind: 'stop' });
        await done;
        await pool.terminate();
        this.#pool = null;
        this.#running = false;
        this.#dropPending(new Error('мир остановлен'));
    }

    send(from: ActorId, to: ActorId, message: Message): void {
        const threadIndex = this.#routes.get(to);
        if (threadIndex === undefined) {
            this.#print(`[мир] нет агента с идентификатором ${to}`);
            return;
        }
        this.#pool?.post(threadIndex, { kind: 'deliver', from, to, message });
    }

    ask(to: ActorId, message: Message, timeoutMs = 1000): Promise<Message> {
        if (!this.#routes.has(to)) {
            return Promise.reject(new Error(`нет агента с идентификатором ${to}`));
        }
        return new Promise<Message>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.#pending.delete(to);
                reject(new Error(`агент ${to} не ответил за ${timeoutMs} мс`));
            }, timeoutMs);
            timer.unref?.();
            this.#pending.set(to, { resolve, reject, timer });
            this.send(WORLD_ID, to, message);
        });
    }

    #accept(from: ActorId, message: Message): void {
        const waiter = this.#pending.get(from);
        if (waiter) {
            this.#pending.delete(from);
            clearTimeout(waiter.timer);
            waiter.resolve(message);
            return;
        }
        this.#print(`[мир] сообщение от ${from}: ${message.type}`);
    }

    #dropPending(error: Error): void {
        for (const waiter of this.#pending.values()) {
            clearTimeout(waiter.timer);
            waiter.reject(error);
        }
        this.#pending.clear();
    }

    #onEvent(event: WorkerEvent, threadIndex: number): void {
        if (event.kind === 'ready') {
            this.#readyThreads.add(threadIndex);
            this.#readyWaiter?.();
            return;
        }
        if (event.kind === 'done') {
            this.#doneThreads.add(threadIndex);
            this.#doneWaiter?.();
            return;
        }
        if (event.kind === 'deliver') {
            if (event.to === WORLD_ID) {
                this.#accept(event.from, event.message);
                return;
            }
            this.send(event.from, event.to, event.message);
            return;
        }
        if (event.kind === 'log') {
            this.#print(`[${event.actorId} · поток ${event.threadId}] ${event.text}`);
            return;
        }
        const who = event.actorId === null ? 'мир' : event.actorId;
        this.#print(`[${who} · ошибка] ${event.text}`);
    }

    #waitFor(marks: Set<number>, expected: number, setWaiter: (waiter: () => void) => void): Promise<void> {
        return new Promise((resolve) => {
            const check = (): void => {
                if (marks.size >= expected) {
                    resolve();
                }
            };
            setWaiter(check);
            check();
        });
    }
}
