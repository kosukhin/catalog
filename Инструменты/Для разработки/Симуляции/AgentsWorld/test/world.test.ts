import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { World, createMessage, WORLD_ID } from '../lib/index.ts';
import type { Population } from '../lib/stats.ts';
import * as echoAgent from '../agents/echoAgent.ts';
import { ROSTER_AGENT_ID, ROSTER_QUERY, ROSTER_REPORT } from '../lib/rosterAgent.ts';

async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error('не дождались условия за отведённое время');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

describe('World', () => {
    it('принимает статистику и создаёт нужное число агентов', () => {
        const world = new World(new Map([[echoAgent, 3]]), { print: () => {} });

        assert.equal(world.state().actors.length, 3);
        assert.deepEqual(world.state().population, { [echoAgent.type]: 3 });
        assert.deepEqual(
            world.state().actors.map((assignment) => assignment.id),
            ['EchoAgent-1', 'EchoAgent-2', 'EchoAgent-3'],
        );
        assert.equal(world.state().running, false);
        assert.equal(world.state().threadCount, 0);
    });

    it('run поднимает мир, агенты работают в разных потоках', async () => {
        const lines: string[] = [];
        const world = new World(new Map([[echoAgent, 4]]), { print: (line) => lines.push(line), threadPoolSize: 2 });

        await world.run();
        assert.equal(world.state().running, true);
        assert.equal(world.state().threadCount, 2);

        await waitFor(() => lines.filter((line) => line.includes('эхо:')).length >= 8);
        const threadIds = new Set(lines.map((line) => /поток (\d+)/.exec(line)?.[1]).filter((id) => id !== undefined));
        assert.ok(threadIds.size >= 2, `ожидали минимум два потока, получили ${[...threadIds].join(', ')}`);

        await world.stop();
        assert.equal(world.state().running, false);
    });

    it('число потоков не превышает число агентов', async () => {
        const world = new World(new Map([[echoAgent, 1]]), { print: () => {}, threadPoolSize: 4 });

        await world.run();
        assert.equal(world.state().threadCount, 1);

        await world.stop();
    });

    it('отвергает обычный объект вместо Map, дубль типа и пустой мир', () => {
        assert.throws(() => new World({ EchoAgent: 1 } as unknown as Population), /статистика мира задаётся как Map/);
        assert.throws(
            () => new World(new Map([[{ ...echoAgent, type: 'EchoAgent' }, 1], [echoAgent, 2]])),
            /тип агента «EchoAgent» подключён дважды/,
        );
        assert.throws(() => new World(new Map()), /мир не может быть пустым/);
        assert.throws(() => new World(new Map([[echoAgent, 0]])), /мир не может быть пустым/);
    });

    it('повторный запуск и остановка без запуска безопасны', async () => {
        const world = new World(new Map([[echoAgent, 1]]), { print: () => {}, threadPoolSize: 1 });

        await world.stop();
        assert.equal(world.state().running, false);

        await world.run();
        await assert.rejects(() => world.run(), /мир уже запущен/);

        await world.stop();
    });

    it('сообщение неизвестному адресату попадает в лог мира', async () => {
        const lines: string[] = [];
        const world = new World(new Map([[echoAgent, 1]]), { print: (line) => lines.push(line), threadPoolSize: 1 });
        await world.run();

        world.send('мир', 'Никто-1', { type: 'echo' });
        await waitFor(() => lines.some((line) => line.includes('нет агента с идентификатором Никто-1')));

        await world.stop();
    });

    it('ask получает ответ агента через почтовый ящик', async () => {
        const world = new World(new Map([[echoAgent, 1]]), { print: () => {}, threadPoolSize: 1 });
        await world.run();

        const reply = await world.ask('EchoAgent-1', { type: 'status-request', payload: { replyTo: 'мир' } });

        assert.equal(reply.type, 'status-report');
        assert.deepEqual((reply.payload as { details?: unknown } | undefined)?.details, { greetings: 2 });
        await world.stop();
    });

    it('ask сразу отвергает запрос к несуществующему агенту', async () => {
        const world = new World(new Map([[echoAgent, 1]]), { print: () => {}, threadPoolSize: 1 });
        await world.run();

        await assert.rejects(
            world.ask('Никто-1', { type: 'status-request', payload: { replyTo: 'мир' } }),
            /нет агента с идентификатором Никто-1/,
        );
        await world.stop();
    });

    it('ask отвергает запрос, если агент не поднялся', async () => {
        const broken = {
            type: 'Тихий',
            moduleUrl: new URL('../lib/actor.ts', import.meta.url).href,
            createAgent: () => ({ type: 'Тихий', receive: () => {} }),
        };
        const world = new World(new Map([[broken, 1]]), { print: () => {}, threadPoolSize: 1 });
        await world.run();

        await assert.rejects(
            world.ask('Тихий-1', { type: 'status-request', payload: { replyTo: 'мир' } }, 150),
            /не ответил за 150 мс/,
        );
        await world.stop();
    });

    it('поднимает служебный реестр и отвечает составом мира по типам', async () => {
        const world = new World(new Map([[echoAgent, 2]]), { print: () => {}, threadPoolSize: 1 });
        await world.run();

        const reply = await world.ask(ROSTER_AGENT_ID, createMessage(ROSTER_QUERY, { types: ['EchoAgent'], replyTo: WORLD_ID }));

        assert.equal(reply.type, ROSTER_REPORT);
        assert.deepEqual((reply.payload as { ids?: unknown } | undefined)?.ids, ['EchoAgent-1', 'EchoAgent-2']);
        assert.deepEqual(world.state().actors.map((actor) => actor.id), ['EchoAgent-1', 'EchoAgent-2']);
        await world.stop();
    });
});
