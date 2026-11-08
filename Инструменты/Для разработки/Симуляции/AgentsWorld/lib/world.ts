/**
 * `World` — сам мир: принимает статистику агентов и запускает их работу.
 *
 * Жизненный цикл:
 *
 * ```js
 * // собирается в приложении, а не в lib:
 * const world = new World(new Map([[myAgent, 6]]));
 * await world.run();   // потоки подняты, агенты работают параллельно
 * await world.stop();  // агенты остановлены, потоки погашены
 * ```
 *
 * Мир не знает ни одного конкретного агента: снаружи приходит `Map`, где ключ —
 * модуль агента, а значение — сколько таких агентов нужно. Из модуля берутся имя
 * типа и адрес кода, поэтому дублировать эти сведения не приходится.
 *
 * Распределение по потокам — по кругу (`agentIndex % workerCount`): при 4 потоках
 * и 4 агентах каждый живёт в своём потоке, при 100 агентах нагрузка размазывается
 * равномерно. Число потоков — `min(размер пула, число агентов)`: держать поток без
 * агентов бессмысленно, а агентов на поток может быть сколько угодно.
 *
 * Мир — единственный, кто знает адрес каждого агента (`routes`). Поэтому сообщение
 * между потоками всегда идёт через него, а сами акторы остаются изолированными
 * и общаются только через почтовые ящики.
 */

import type { ActorAssignment, ActorId, Message, WorkerEvent } from './protocol.ts';
import { normalizePopulation, summarizePopulation, type Population } from './stats.ts';
import { ThreadPool } from './threadPool.ts';

/** Настройки мира: всё, что не касается состава агентов. */
export interface WorldOptions {
    /** Сколько потоков использовать; по умолчанию — число доступных ядер. */
    readonly threadPoolSize?: number;
    /** Куда печатать строки мира; по умолчанию `console.log`. */
    readonly print?: (line: string) => void;
}

export class World {
    readonly #assignments: ActorAssignment[];
    readonly #print: (line: string) => void;
    readonly #threadPoolSize: number | undefined;
    /** Адрес каждого агента: id → индекс потока. */
    readonly #routes = new Map<ActorId, number>();
    readonly #readyThreads = new Set<number>();
    readonly #doneThreads = new Set<number>();
    #readyWaiter: (() => void) | null = null;
    #doneWaiter: (() => void) | null = null;
    #pool: ThreadPool | null = null;
    #running = false;

    /**
     * @param population состав мира: `Map` «модуль агента → количество»
     * @param options настройки мира (потоки, печать)
     * @throws если статистика некорректна или модуль агента неправильной формы
     */
    constructor(population: Population, options: WorldOptions = {}) {
        this.#assignments = normalizePopulation(population);
        this.#print = options.print ?? ((line: string): void => console.log(line));
        this.#threadPoolSize = options.threadPoolSize;
    }

    /** Состав мира: кого именно создадут при запуске. */
    get actors(): readonly ActorAssignment[] {
        return this.#assignments;
    }

    /** Сколько агентов каждого типа в мире. */
    get population(): Record<string, number> {
        return summarizePopulation(this.#assignments);
    }

    /** Работает ли мир прямо сейчас. */
    get running(): boolean {
        return this.#running;
    }

    /** Сколько потоков занято агентами (0 до запуска). */
    get threadCount(): number {
        return new Set(this.#routes.values()).size;
    }

    /**
     * Запускает мир: поднимает потоки, создаёт агентов и ждёт их готовности.
     *
     * После возврата из `run()` агенты уже работают, а сам метод не блокирует
     * вызывающего: мир живёт, пока не вызван `stop()`.
     */
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

    /** Останавливает мир: агенты завершают работу, потоки гасятся. */
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
    }

    /** Отправляет сообщение агенту по адресу — единственный внешний вход в мир. */
    send(from: ActorId, to: ActorId, message: Message): void {
        const threadIndex = this.#routes.get(to);
        if (threadIndex === undefined) {
            this.#print(`[мир] нет агента с идентификатором ${to}`);
            return;
        }
        this.#pool?.post(threadIndex, { kind: 'deliver', from, to, message });
    }

    /** Разбирает события, приходящие из потоков. */
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

    /** Ждёт, пока в наборе окажется `expected` отметок о потоках. */
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
