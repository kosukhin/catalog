import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import type { WorkerEvent } from '../lib/protocol.ts';

/** Адрес модуля агента: поток грузит код сам, поэтому в наряде едет строка. */
const agentModuleUrl = new URL('../agents/echoAgent.ts', import.meta.url).href;
/** Модуль без createAgent — на нём проверяем понятность ошибки. */
const brokenModuleUrl = new URL('../lib/actor.ts', import.meta.url).href;

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
    const worker = new Worker(new URL('../lib/workerEntry.ts', import.meta.url));
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
            actors: [{ id: 'EchoAgent-1', type: 'EchoAgent', moduleUrl: agentModuleUrl, options: { greetings: 1 } }],
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
            actors: [{ id: 'EchoAgent-1', type: 'EchoAgent', moduleUrl: agentModuleUrl, options: { greetings: 0 } }],
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

    it('сообщает об ошибке, если модуль агента не загрузился или в нём нет createAgent', async () => {
        const { worker, events } = spawnWorker();

        worker.postMessage({
            kind: 'start',
            actors: [
                { id: 'Битый-1', type: 'Битый', moduleUrl: 'file:///нет/такого/модуля.ts', options: {} },
                { id: 'БезФабрики-1', type: 'БезФабрики', moduleUrl: brokenModuleUrl, options: {} },
                { id: 'EchoAgent-1', type: 'EchoAgent', moduleUrl: agentModuleUrl, options: { greetings: 0 } },
            ],
        });
        await waitFor(() => events.some((event) => event.kind === 'ready'));

        const ready = events.find((event) => event.kind === 'ready');
        assert.ok(ready && ready.kind === 'ready');
        assert.deepEqual(ready.actorIds, ['EchoAgent-1'], 'создан только тот агент, чей модуль загрузился');

        const texts = events.filter((event) => event.kind === 'error').map((event) => (event.kind === 'error' ? event.text : ''));
        assert.match(texts[0] ?? '', /не удалось загрузить модуль агента file:\/\/\/нет\/такого\/модуля\.ts/);
        assert.match(texts[1] ?? '', /нет экспорта createAgent/);

        worker.postMessage({ kind: 'deliver', from: 'мир', to: 'Никто-1', message: { type: 'echo' } });
        await waitFor(() => events.filter((event) => event.kind === 'error').length === 3);
        const withDelivery = events.filter((event) => event.kind === 'error').map((event) => (event.kind === 'error' ? event.text : ''));
        assert.match(withDelivery[2] ?? '', /^в потоке \d+ нет агента Никто-1$/);

        await worker.terminate();
    });

    it('по команде stop останавливает акторов и отвечает done', async () => {
        const { worker, events } = spawnWorker();

        worker.postMessage({
            kind: 'start',
            actors: [{ id: 'EchoAgent-1', type: 'EchoAgent', moduleUrl: agentModuleUrl, options: { greetings: 1 } }],
        });
        await waitFor(() => events.some((event) => event.kind === 'ready'));

        worker.postMessage({ kind: 'stop' });
        await waitFor(() => events.some((event) => event.kind === 'done'));

        await worker.terminate();
    });
});
