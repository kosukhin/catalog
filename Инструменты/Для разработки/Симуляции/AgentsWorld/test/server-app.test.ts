import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.ts';
import { createServerConfig } from '../server/config.ts';
import type { WorldQuery } from '../server/snapshot.ts';

/** Мир-заглушка: состояния заданы таблицей, потоков нет. */
function createWorld(states: Record<string, Record<string, unknown>>): WorldQuery {
    return {
        running: true,
        threadCount: 3,
        actors: Object.keys(states).map((id) => ({ id, type: 'HumanAgent' })),
        async ask(to: string) {
            if (!(to in states)) {
                throw new Error(`агент ${to} не ответил`);
            }
            return { type: 'status-report', payload: { id: to, type: 'HumanAgent', details: states[to] } };
        },
    };
}

/** Поднимает приложение на свободном порту и гасит после проверки. */
async function withApp(world: WorldQuery, run: (url: string) => Promise<void>): Promise<void> {
    const app = createApp(world, createServerConfig({ PAGE_SIZE: '2' }));
    const server = app.listen(0);
    await new Promise<void>((resolve) => {
        server.once('listening', resolve);
    });
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    try {
        await run(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    }
}

describe('express app', () => {
    it('отдаёт сводку мира', async () => {
        const world = createWorld({ 'HumanAgent-1': { name: 'Иван' }, 'HumanAgent-2': { name: 'Анна' } });

        await withApp(world, async (url) => {
            const summary = await (await fetch(`${url}/api/world`)).json();

            assert.equal(summary.running, true);
            assert.equal(summary.threadCount, 3);
            assert.equal(summary.total, 2);
            assert.deepEqual(summary.byType, { HumanAgent: 2 });
        });
    });

    it('отдаёт агентов страницами', async () => {
        const world = createWorld({
            'HumanAgent-1': { name: 'Иван' },
            'HumanAgent-2': { name: 'Анна' },
            'HumanAgent-3': { name: 'Пётр' },
        });

        await withApp(world, async (url) => {
            const first = await (await fetch(`${url}/api/agents`)).json();
            const second = await (await fetch(`${url}/api/agents?page=2`)).json();

            assert.equal(first.page, 1);
            assert.equal(first.pageSize, 2);
            assert.equal(first.pages, 2);
            assert.equal(first.total, 3);
            assert.deepEqual(first.items.map((agent: { id: string }) => agent.id), ['HumanAgent-1', 'HumanAgent-2']);
            assert.deepEqual(second.items.map((agent: { id: string }) => agent.id), ['HumanAgent-3']);
        });
    });

    it('ищет по состоянию агента', async () => {
        const world = createWorld({
            'HumanAgent-1': { name: 'Иван', profession: 'врач' },
            'HumanAgent-2': { name: 'Анна', profession: 'учитель' },
        });

        await withApp(world, async (url) => {
            const found = await (await fetch(`${url}/api/agents?search=${encodeURIComponent('врач')}`)).json();
            const nobody = await (await fetch(`${url}/api/agents?search=${encodeURIComponent('пожарный')}`)).json();

            assert.deepEqual(found.items.map((agent: { id: string }) => agent.id), ['HumanAgent-1']);
            assert.equal(found.total, 1);
            assert.deepEqual(nobody.items, []);
            assert.equal(nobody.pages, 1);
        });
    });

    it('подтягивает номер страницы к допустимому диапазону', async () => {
        const world = createWorld({ 'HumanAgent-1': { name: 'Иван' }, 'HumanAgent-2': { name: 'Анна' } });

        await withApp(world, async (url) => {
            const beyond = await (await fetch(`${url}/api/agents?page=99`)).json();
            const zero = await (await fetch(`${url}/api/agents?page=0&pageSize=1000`)).json();

            assert.equal(beyond.page, 1);
            assert.equal(zero.page, 1);
            assert.equal(zero.pageSize, 200, 'размер страницы ограничен двумястами');
        });
    });

    it('раздаёт дашборд по корню', async () => {
        await withApp(createWorld({ 'HumanAgent-1': { name: 'Иван' } }), async (url) => {
            const response = await fetch(url);
            const html = await response.text();

            assert.equal(response.status, 200);
            assert.match(html, /AgentsWorld — дашборд/);
            assert.match(html, /\/api\/agents/);
        });
    });
});
