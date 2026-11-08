import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import type { WorkerEvent } from '../src/protocol.ts';

/** Ждёт выполнения условия: поток отвечает асинхронно. */
async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error('не дождались условия за отведённое время');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

/** Поднимает воркер напрямую, как это делает пул потоков. */
function spawnWorker(): { worker: Worker; events: WorkerEvent[] } {
    const worker = new Worker(new URL('../src/workerEntry.ts', import.meta.url));
    const events: WorkerEvent[] = [];
    worker.on('message', (event: WorkerEvent) => {
        events.push(event);
    });
    return { worker, events };
}

describe('workerEntry', () => {
    it('создаёт акторов по наряду и сообщает о готовности', async () => {
        const { worker, events } = spawnWorker();

        worker.postMessage({
            kind: 'start',
            actors: [{ id: 'EchoAgent-1', type: 'EchoAgent', options: { greetings: 1 } }],
        });
        await waitFor(() => events.some((event) => event.kind === 'ready'));

        const ready = events.find((event) => event.kind === 'ready');
        assert.ok(ready && ready.kind === 'ready');
        assert.deepEqual(ready.actorIds, ['EchoAgent-1']);

        await worker.terminate();
    });

    it('доставляет сообщение извне в почтовый ящик агента и возвращает лог', async () => {
        const { worker, events } = spawnWorker();

        worker.postMessage({
            kind: 'start',
            actors: [{ id: 'EchoAgent-1', type: 'EchoAgent', options: { greetings: 0 } }],
        });
        await waitFor(() => events.some((event) => event.kind === 'ready'));

        worker.postMessage({
            kind: 'deliver',
            from: 'мир',
            to: 'EchoAgent-1',
            message: { type: 'echo', payload: { text: 'извне' } },
        });
        await waitFor(() => events.some((event) => event.kind === 'log' && event.text.includes('извне')));

        const log = events.find((event) => event.kind === 'log');
        assert.ok(log && log.kind === 'log');
        assert.equal(log.actorId, 'EchoAgent-1');
        assert.equal(typeof log.threadId, 'number');

        await worker.terminate();
    });

    it('сообщает об ошибке для неизвестного адресата и неизвестного типа', async () => {
        const { worker, events } = spawnWorker();

        worker.postMessage({
            kind: 'start',
            actors: [
                { id: 'Призрак-1', type: 'Призрак', options: {} },
                { id: 'EchoAgent-1', type: 'EchoAgent', options: { greetings: 0 } },
            ],
        });
        await waitFor(() => events.some((event) => event.kind === 'ready'));

        worker.postMessage({ kind: 'deliver', from: 'мир', to: 'Никто-1', message: { type: 'echo' } });
        await waitFor(() => events.filter((event) => event.kind === 'error').length === 2);

        const errors = events.filter((event) => event.kind === 'error');
        const texts = errors.map((event) => (event.kind === 'error' ? event.text : ''));
        assert.deepEqual(texts[0], 'неизвестный тип агента «Призрак»');
        assert.match(texts[1] ?? '', /^в потоке \d+ нет агента Никто-1$/);

        await worker.terminate();
    });

    it('по команде stop останавливает акторов и отвечает done', async () => {
        const { worker, events } = spawnWorker();

        worker.postMessage({
            kind: 'start',
            actors: [{ id: 'EchoAgent-1', type: 'EchoAgent', options: { greetings: 1 } }],
        });
        await waitFor(() => events.some((event) => event.kind === 'ready'));

        worker.postMessage({ kind: 'stop' });
        await waitFor(() => events.some((event) => event.kind === 'done'));

        await worker.terminate();
    });
});
