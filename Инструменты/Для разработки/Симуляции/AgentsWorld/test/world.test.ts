import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../lib/world.ts';
import { ECHO_AGENT_TYPE } from '../agents/echoAgent.ts';

/** Ждёт выполнения условия: мир работает асинхронно. */
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
        const world = new World({ [ECHO_AGENT_TYPE]: 3 }, { print: () => {} });

        assert.equal(world.actors.length, 3);
        assert.deepEqual(world.population, { [ECHO_AGENT_TYPE]: 3 });
        assert.deepEqual(
            world.actors.map((assignment) => assignment.id),
            ['EchoAgent-1', 'EchoAgent-2', 'EchoAgent-3'],
        );
        assert.equal(world.running, false);
        assert.equal(world.threadCount, 0);
    });

    it('run поднимает мир, агенты работают в разных потоках', async () => {
        const lines: string[] = [];
        const world = new World({ [ECHO_AGENT_TYPE]: 4 }, { print: (line) => lines.push(line), threadPoolSize: 2 });

        await world.run();
        assert.equal(world.running, true);
        assert.equal(world.threadCount, 2);

        await waitFor(() => lines.filter((line) => line.includes('эхо:')).length >= 8);
        const threadIds = new Set(lines.map((line) => /поток (\d+)/.exec(line)?.[1]).filter((id) => id !== undefined));
        assert.ok(threadIds.size >= 2, `ожидали минимум два потока, получили ${[...threadIds].join(', ')}`);

        await world.stop();
        assert.equal(world.running, false);
    });

    it('число потоков не превышает число агентов', async () => {
        const world = new World({ [ECHO_AGENT_TYPE]: 1 }, { print: () => {}, threadPoolSize: 4 });

        await world.run();
        assert.equal(world.threadCount, 1);

        await world.stop();
    });

    it('отвергает неизвестный тип агента и пустой мир', () => {
        assert.throws(() => new World({ Призрак: 1 }), /неизвестный тип агента «Призрак»/);
        assert.throws(() => new World({}), /мир не может быть пустым/);
    });

    it('повторный запуск и остановка без запуска безопасны', async () => {
        const world = new World({ [ECHO_AGENT_TYPE]: 1 }, { print: () => {}, threadPoolSize: 1 });

        await world.stop();
        assert.equal(world.running, false);

        await world.run();
        await assert.rejects(() => world.run(), /мир уже запущен/);

        await world.stop();
    });

    it('сообщение неизвестному адресату попадает в лог мира', async () => {
        const lines: string[] = [];
        const world = new World({ [ECHO_AGENT_TYPE]: 1 }, { print: (line) => lines.push(line), threadPoolSize: 1 });
        await world.run();

        world.send('мир', 'Никто-1', { type: 'echo' });
        await waitFor(() => lines.some((line) => line.includes('нет агента с идентификатором Никто-1')));

        await world.stop();
    });
});
