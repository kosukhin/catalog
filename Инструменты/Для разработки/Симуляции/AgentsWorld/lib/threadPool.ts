import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import type { WorkerCommand, WorkerEvent } from './protocol.ts';

export interface ThreadPoolOptions {
    readonly size?: number;
    readonly maxWorkers?: number;
    readonly workerScript?: URL;
    readonly onEvent: (event: WorkerEvent, threadIndex: number) => void;
    readonly onWorkerError?: (threadIndex: number, error: Error) => void;
}

export class ThreadPool {
    readonly size: number;
    readonly #workers: Worker[] = [];
    readonly #script: URL;
    readonly #onEvent: (event: WorkerEvent, threadIndex: number) => void;
    readonly #onWorkerError: ((threadIndex: number, error: Error) => void) | undefined;
    #terminated = false;

    constructor(options: ThreadPoolOptions) {
        const requested = options.size ?? availableParallelism();
        const limit = options.maxWorkers ?? Number.POSITIVE_INFINITY;
        this.size = Math.max(1, Math.min(Math.trunc(requested), limit));
        this.#script = options.workerScript ?? new URL('./workerEntry.ts', import.meta.url);
        this.#onEvent = options.onEvent;
        this.#onWorkerError = options.onWorkerError;
        for (let threadIndex = 0; threadIndex < this.size; threadIndex += 1) {
            this.#spawn(threadIndex);
        }
    }

    get threadIndexes(): number[] {
        return this.#workers.map((_worker, threadIndex) => threadIndex);
    }

    post(threadIndex: number, command: WorkerCommand): void {
        if (this.#terminated) {
            throw new Error('пул потоков уже остановлен');
        }
        const worker = this.#workers[threadIndex];
        if (!worker) {
            throw new Error(`в пуле нет потока с индексом ${threadIndex}`);
        }
        worker.postMessage(command);
    }

    postAll(command: WorkerCommand): void {
        for (const threadIndex of this.threadIndexes) {
            this.post(threadIndex, command);
        }
    }

    async terminate(): Promise<void> {
        if (this.#terminated) {
            return;
        }
        this.#terminated = true;
        await Promise.all(this.#workers.map((worker) => worker.terminate()));
        this.#workers.length = 0;
    }

    #spawn(threadIndex: number): void {
        const worker = new Worker(this.#script, { name: `agents-world-${threadIndex}` });
        worker.on('message', (event: WorkerEvent) => {
            this.#onEvent(event, threadIndex);
        });
        worker.on('error', (error: Error) => {
            this.#onWorkerError?.(threadIndex, error);
        });
        this.#workers.push(worker);
    }
}
