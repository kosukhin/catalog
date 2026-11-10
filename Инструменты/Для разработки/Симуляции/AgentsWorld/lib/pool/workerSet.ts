import { Worker } from 'node:worker_threads';
import type { WorkerCommand, WorkerEvent } from '../protocol/worker.ts';

export interface WorkerSetOptions {
    readonly script: URL;
    readonly onEvent: (event: WorkerEvent, threadIndex: number) => void;
    readonly onError: (threadIndex: number, error: Error) => void;
}

export class WorkerSet {
    readonly #workers: Worker[] = [];
    readonly #options: WorkerSetOptions;

    constructor(options: WorkerSetOptions) {
        this.#options = options;
    }

    open(threadIndex: number): void {
        const worker = new Worker(this.#options.script, { name: `agents-world-${threadIndex}` });
        worker.on('message', (event: WorkerEvent) => {
            this.#options.onEvent(event, threadIndex);
        });
        worker.on('error', (error: Error) => {
            this.#options.onError(threadIndex, error);
        });
        this.#workers.push(worker);
    }

    send(threadIndex: number, command: WorkerCommand): void {
        const worker = this.#workers[threadIndex];
        if (!worker) {
            throw new Error(`в пуле нет потока с индексом ${threadIndex}`);
        }
        worker.postMessage(command);
    }

    close(): Promise<void> {
        const workers = this.#workers.splice(0, this.#workers.length);
        return Promise.all(workers.map((worker) => worker.terminate())).then(() => undefined);
    }
}
