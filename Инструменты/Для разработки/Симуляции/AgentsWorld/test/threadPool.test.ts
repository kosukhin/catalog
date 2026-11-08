import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ThreadPool } from '../lib/threadPool.ts';
import type { WorkerEvent } from '../lib/protocol.ts';

/** Ждёт выполнения условия: воркер отвечает асинхронно. */
async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error('не дождались условия за отведённое время');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

describe('ThreadPool', () => {
    it('размер пула не превышает maxWorkers и не бывает нулевым', async () => {
        const events: WorkerEvent[] = [];
        const pool = new ThreadPool({ size: 8, maxWorkers: 2, onEvent: (event) => events.push(event) });

        assert.equal(pool.size, 2);
        assert.deepEqual(pool.threadIndexes, [0, 1]);
        await pool.terminate();

        const minimum = new ThreadPool({ size: 0, onEvent: (event) => events.push(event) });
        assert.equal(minimum.size, 1);
        await minimum.terminate();
    });

    it('доставляет команду в поток и возвращает событие с индексом потока', async () => {
        const received: Array<{ event: WorkerEvent; threadIndex: number }> = [];
        const pool = new ThreadPool({
            size: 2,
            onEvent: (event, threadIndex) => {
                received.push({ event, threadIndex });
            },
        });

        pool.post(1, {
            kind: 'start',
            actors: [{ id: 'EchoAgent-1', type: 'EchoAgent', options: { greetings: 1 } }],
        });
        await waitFor(() => received.some((item) => item.event.kind === 'ready'));

        const ready = received.find((item) => item.event.kind === 'ready');
        assert.ok(ready);
        assert.equal(ready.threadIndex, 1);
        await pool.postAll({ kind: 'stop' });
        await waitFor(() => received.filter((item) => item.event.kind === 'done').length === 2);

        await pool.terminate();
    });

    it('после остановки не принимает команды', async () => {
        const pool = new ThreadPool({ size: 1, onEvent: () => {} });
        await pool.terminate();

        assert.throws(() => pool.post(0, { kind: 'stop' }), /уже остановлен/);
        assert.throws(() => pool.post(5, { kind: 'stop' }), /уже остановлен/);
    });

    it('сообщает о несуществующем индексе потока', async () => {
        const pool = new ThreadPool({ size: 1, onEvent: () => {} });

        assert.throws(() => pool.post(3, { kind: 'stop' }), /нет потока с индексом 3/);
        await pool.terminate();
    });
});
