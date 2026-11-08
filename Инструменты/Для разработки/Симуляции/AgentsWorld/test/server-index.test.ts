import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../server/index.ts';
import { createServerConfig } from '../server/config.ts';

describe('server index', () => {
    it('поднимает мир и отдаёт сводку, состояния агентов и дашборд', async () => {
        const running = await startServer(createServerConfig({ PORT: '0', HUMANS: '2', PAGE_SIZE: '3' }));

        try {
            const summary = await (await fetch(`${running.url}/api/world`)).json();
            assert.equal(summary.running, true);
            assert.equal(summary.total, 4, 'два человека плюс время и каталог');
            assert.deepEqual(summary.byType, { DayAgent: 1, HumanCatalogAgent: 1, HumanAgent: 2 });
            const agents = await (await fetch(`${running.url}/api/agents?pageSize=10`)).json();
            const clock = agents.items.find((agent: { type: string }) => agent.type === 'DayAgent');
            assert.equal(clock.details.timeScale, 10, 'время идёт в 10 раз быстрее');

            const human = agents.items.find((agent: { type: string }) => agent.type === 'HumanAgent');
            assert.equal(human.alive, true);
            assert.equal(typeof human.details.name, 'string');
            assert.ok(['спит', 'активен', 'в туалете', 'принимает пищу'].includes(human.details.state));

            const html = await (await fetch(running.url)).text();
            assert.match(html, /AgentsWorld — дашборд/);
        } finally {
            await running.stop();
        }

        assert.equal(running.world.running, false);
    });

    it('виртуальное время идёт быстрее реального', async () => {
        const running = await startServer(createServerConfig({ PORT: '0', HUMANS: '1' }));

        try {
            const before = await (await fetch(`${running.url}/api/world`)).json();
            await new Promise((resolve) => setTimeout(resolve, 400));
            const after = await (await fetch(`${running.url}/api/world`)).json();

            assert.ok(after.clock.iso > before.clock.iso, 'виртуальное время должно идти вперёд');
        } finally {
            await running.stop();
        }
    });

    it('темп времени приходит агенту из настроек мира', async () => {
        const running = await startServer(createServerConfig({ PORT: '0', HUMANS: '1', TIME_SCALE: '60' }));

        try {
            const agents = await (await fetch(`${running.url}/api/agents?pageSize=10`)).json();
            const clock = agents.items.find((agent: { type: string }) => agent.type === 'DayAgent');

            assert.equal(clock.details.timeScale, 60, 'агент получил настройки из состава мира');
        } finally {
            await running.stop();
        }
    });
});
