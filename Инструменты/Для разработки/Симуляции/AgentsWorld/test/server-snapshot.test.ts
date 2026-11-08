import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { takeSnapshot, type WorldQuery } from '../server/snapshot.ts';
import { STATUS_REPORT, type Message } from '../lib/protocol.ts';
import { TIME_REQUEST, TIME_REPORT } from '../agents/dayAgent.ts';

/** Заглушка мира: отвечает за агентов по таблице. */
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

    it('минимальный срок ожидания ответа не мешает живым агентам', async () => {
        const world = createWorld({ a: { name: 'Иван' } }, [{ id: 'a', type: 'HumanAgent' }]);

        const snapshot = await takeSnapshot(world, 'clock', 50);

        assert.equal(snapshot.agents[0]?.alive, true);
        assert.equal(snapshot.clock, null);
    });
});
