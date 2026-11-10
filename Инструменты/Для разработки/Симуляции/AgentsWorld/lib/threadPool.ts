import type { WorkerCommand, WorkerEvent } from './protocol/worker.ts';
import { poolSize } from './pool/poolSize.ts';
import { WorkerSet } from './pool/workerSet.ts';

export interface ThreadPoolOptions {
    readonly size?: number;
    readonly maxWorkers?: number;
    readonly workerScript?: URL;
    readonly onEvent: (event: WorkerEvent, threadIndex: number) => void;
    readonly onWorkerError?: (threadIndex: number, error: Error) => void;
}

export class ThreadPool {
    readonly #size: number;
    readonly #set: WorkerSet;
    #terminated = false;

    constructor(options: ThreadPoolOptions) {
        this.#size = poolSize(options.size, options.maxWorkers);
        this.#set = new WorkerSet({
            script: options.workerScript ?? new URL('./workerEntry.ts', import.meta.url),
            onEvent: options.onEvent,
            onError: (threadIndex, error): void => {
                options.onWorkerError?.(threadIndex, error);
            },
        });
        for (let threadIndex = 0; threadIndex < this.#size; threadIndex += 1) {
            this.#set.open(threadIndex);
        }
    }

    report(): { readonly size: number; readonly indexes: readonly number[] } {
        return { size: this.#size, indexes: Array.from({ length: this.#size }, (_unused, index) => index) };
    }

    post(threadIndex: number, command: WorkerCommand): void {
        if (this.#terminated) {
            throw new Error('пул потоков уже остановлен');
        }
        this.#set.send(threadIndex, command);
    }

    postAll(command: WorkerCommand): void {
        for (const threadIndex of this.report().indexes) {
            this.post(threadIndex, command);
        }
    }

    async terminate(): Promise<void> {
        if (this.#terminated) {
            return;
        }
        this.#terminated = true;
        await this.#set.close();
    }
}

