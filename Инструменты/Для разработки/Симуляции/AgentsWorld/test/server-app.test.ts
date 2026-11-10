import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.ts';
import { createServerConfig } from '../server/config.ts';
import type { WorldQuery } from '../server/snapshot.ts';
import { PHYSICS_STATE } from '../agents/physicsAgent.ts';
import { TIME_REPORT } from '../agents/dayAgent.ts';

function createWorld(states: Record<string, Record<string, unknown>>, clock: unknown = null): WorldQuery {
    return {
        running: true,
        threadCount: 3,
        actors: Object.keys(states).map((id) => ({ id, type: 'HumanAgent' })),
        async ask(to: string) {
            if (to === 'DayAgent-1') {
                if (clock === null) {
                    throw new Error('агент DayAgent-1 не ответил');
                }
                return { type: TIME_REPORT, payload: clock };
            }
            if (!(to in states)) {
                throw new Error(`агент ${to} не ответил`);
            }
            return { type: 'status-report', payload: { id: to, type: 'HumanAgent', details: states[to] } };
        },
    };
}

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

    it('отдаёт время мира отдельным лёгким запросом', async () => {
        const clock = { hours: 7, minutes: 15, phase: 'день' };
        const world = createWorld({ 'HumanAgent-1': { name: 'Иван' } }, clock);

        await withApp(world, async (url) => {
            const json = await (await fetch(`${url}/api/clock`)).json();

            assert.deepEqual(json, { clock });
        });
    });

    it('отдаёт пустые часы, если DayAgent не ответил', async () => {
        await withApp(createWorld({ 'HumanAgent-1': { name: 'Иван' } }), async (url) => {
            const json = await (await fetch(`${url}/api/clock`)).json();

            assert.deepEqual(json, { clock: null });
        });
    });

    it('отдаёт состояние физики', async () => {
        const state = {
            speed: 5,
            stepSeconds: 1,
            minDistance: 1,
            arriveDistance: 1,
            bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } },
            bodies: [{ id: 'HumanAgent-1', position: { x: 5, y: 0, z: 0 } }],
            moving: ['HumanAgent-1'],
        };
        const world: WorldQuery = {
            running: true,
            threadCount: 1,
            actors: [{ id: 'PhysicsAgent-1', type: 'PhysicsAgent' }],
            async ask() {
                return { type: PHYSICS_STATE, payload: state };
            },
        };

        await withApp(world, async (url) => {
            const json = await (await fetch(`${url}/api/physics`)).json();

            assert.deepEqual(json, state);
        });
    });
});
