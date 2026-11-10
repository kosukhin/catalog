import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { takeClock, takePhysics, takeSnapshot, type WorldQuery } from '../server/snapshot.ts';
import { STATUS_REPORT, type Message } from '../lib/protocol.ts';
import { TIME_REQUEST, TIME_REPORT } from '../agents/dayAgent.ts';
import { PHYSICS_LIST, PHYSICS_STATE } from '../agents/physicsAgent.ts';

function createWorld(
    answers: Record<string, unknown>,
    actors: Array<{ id: string; type: string }> = Object.keys(answers).map((id) => ({ id, type: 'HumanAgent' })),
): WorldQuery {
    return {
        running: true,
        threadCount: 2,
        actors,
        async ask(to: string, message: Message): Promise<Message> {
            if (!(to in answers)) {
                throw new Error(`агент ${to} не ответил`);
            }
            if (message.type === TIME_REQUEST) {
                return { type: TIME_REPORT, payload: answers[to] };
            }
            return { type: STATUS_REPORT, payload: { id: to, type: 'HumanAgent', details: answers[to] } };
        },
    };
}

describe('snapshot', () => {
    it('собирает общее число агентов и разбивку по типам', async () => {
        const world = createWorld({ a: { name: 'Иван' }, b: { name: 'Анна' } }, [
            { id: 'a', type: 'HumanAgent' },
            { id: 'b', type: 'HumanAgent' },
            { id: 'clock', type: 'DayAgent' },
        ]);

        const snapshot = await takeSnapshot(world, 'clock');

        assert.equal(snapshot.running, true);
        assert.equal(snapshot.threadCount, 2);
        assert.equal(snapshot.total, 3);
        assert.deepEqual(snapshot.byType, { HumanAgent: 2, DayAgent: 1 });
    });

    it('переносит подробности состояния агента', async () => {
        const world = createWorld({ a: { name: 'Иван', state: 'активен' } }, [{ id: 'a', type: 'HumanAgent' }]);

        const [agent] = (await takeSnapshot(world, 'clock')).agents;

        assert.deepEqual(agent, { id: 'a', type: 'HumanAgent', alive: true, details: { name: 'Иван', state: 'активен' } });
    });

    it('помечает молчащего агента как alive: false', async () => {
        const world = createWorld({ a: { name: 'Иван' } }, [
            { id: 'a', type: 'HumanAgent' },
            { id: 'молчун', type: 'HumanAgent' },
        ]);

        const snapshot = await takeSnapshot(world, 'clock');
        const silent = snapshot.agents.find((agent) => agent.id === 'молчун');

        assert.deepEqual(silent, { id: 'молчун', type: 'HumanAgent', alive: false, details: {} });
    });

    it('часы мира берутся у отдельного агента и не ломают снимок при сбое', async () => {
        const withClock = createWorld({ clock: { hours: 14, phase: 'день' } }, [{ id: 'clock', type: 'DayAgent' }, { id: 'a', type: 'HumanAgent' }]);
        const withoutClock = createWorld({ a: { name: 'Иван' } }, [{ id: 'a', type: 'HumanAgent' }]);

        assert.deepEqual((await takeSnapshot(withClock, 'clock')).clock, { hours: 14, phase: 'день' });
        assert.equal((await takeSnapshot(withoutClock, 'clock')).clock, null);
    });

    it('лёгкий запрос часов спрашивает только DayAgent', async () => {
        const asked: string[] = [];
        const world: WorldQuery = {
            running: true,
            threadCount: 2,
            actors: [{ id: 'a', type: 'HumanAgent' }, { id: 'clock', type: 'DayAgent' }],
            async ask(to: string, message: Message): Promise<Message> {
                asked.push(to);
                assert.equal(message.type, TIME_REQUEST);
                return { type: TIME_REPORT, payload: { hours: 7, minutes: 15, phase: 'день' } };
            },
        };

        const clock = await takeClock(world, 'clock');

        assert.deepEqual(asked, ['clock']);
        assert.deepEqual(clock, { hours: 7, minutes: 15, phase: 'день' });
    });

    it('лёгкий запрос часов возвращает null при молчании DayAgent', async () => {
        const world: WorldQuery = {
            running: true,
            threadCount: 1,
            actors: [{ id: 'clock', type: 'DayAgent' }],
            async ask() {
                throw new Error('таймаут');
            },
        };

        assert.equal(await takeClock(world, 'clock'), null);
    });

    it('минимальный срок ожидания ответа не мешает живым агентам', async () => {
        const world = createWorld({ a: { name: 'Иван' } }, [{ id: 'a', type: 'HumanAgent' }]);

        const snapshot = await takeSnapshot(world, 'clock', 50);

        assert.equal(snapshot.agents[0]?.alive, true);
        assert.equal(snapshot.clock, null);
    });

    it('забирает состояние физики у агента физики', async () => {
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
            actors: [{ id: 'physics', type: 'PhysicsAgent' }],
            async ask(to: string, message: Message) {
                assert.equal(to, 'physics');
                assert.equal(message.type, PHYSICS_LIST);
                return { type: PHYSICS_STATE, payload: state };
            },
        };

        const result = await takePhysics(world, 'physics');

        assert.deepEqual(result, state);
    });

    it('падает, если агент физики ответил не тем сообщением', async () => {
        const world: WorldQuery = {
            running: true,
            threadCount: 1,
            actors: [{ id: 'physics', type: 'PhysicsAgent' }],
            async ask() {
                return { type: 'status-report', payload: {} };
            },
        };

        await assert.rejects(() => takePhysics(world, 'physics'), /вместо/);
    });
});
