/**
 * Пул потоков — реальный параллелизм через `worker_threads`.
 *
 * JavaScript исполняет код в одном потоке, поэтому «параллельно» внутри одного
 * потока нельзя: агенты будут просто переключаться. Чтобы агенты действительно
 * работали одновременно, каждый поток — отдельный `Worker`, то есть отдельный
 * поток ОС со своей памятью.
 *
 * Пул сознательно не умеет распределять работу сам: он лишь поднимает потоки,
 * передаёт в них команды и отдаёт события наверх. Решение «кто в каком потоке
 * живёт» принимает мир.
 *
 * Размер пула по умолчанию равен числу доступных ядер; `maxWorkers` позволяет
 * не поднимать потоков больше, чем есть агентов.
 */

import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import type { WorkerCommand, WorkerEvent } from './protocol.ts';

/** Параметры пула. */
export interface ThreadPoolOptions {
    /** Сколько потоков поднять; по умолчанию — число доступных ядер. */
    readonly size?: number;
    /** Верхняя граница числа потоков (например, общее число агентов). */
    readonly maxWorkers?: number;
    /** Скрипт воркера; по умолчанию — `workerEntry.ts` рядом с этим модулем. */
    readonly workerScript?: URL;
    /** Обработчик событий воркеров; второй аргумент — индекс потока в пуле. */
    readonly onEvent: (event: WorkerEvent, threadIndex: number) => void;
    /** Обработчик сбоя самого воркера (не актора). */
    readonly onWorkerError?: (threadIndex: number, error: Error) => void;
}

export class ThreadPool {
    /** Сколько потоков в пуле. */
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

    /** Индексы потоков пула. */
    get threadIndexes(): number[] {
        return this.#workers.map((_worker, threadIndex) => threadIndex);
    }

    /** Отправляет команду в конкретный поток. */
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

    /** Отправляет команду во все потоки. */
    postAll(command: WorkerCommand): void {
        for (const threadIndex of this.threadIndexes) {
            this.post(threadIndex, command);
        }
    }

    /** Останавливает все потоки. */
    async terminate(): Promise<void> {
        if (this.#terminated) {
            return;
        }
        this.#terminated = true;
        await Promise.all(this.#workers.map((worker) => worker.terminate()));
        this.#workers.length = 0;
    }

    /** Поднимает один поток и подписывается на его события. */
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
