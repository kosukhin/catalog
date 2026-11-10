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
            assert.equal(summary.total, 10, 'два человека плюс время, каталог, физика, банк, дом, доска и туалет и тикер');
            assert.deepEqual(summary.byType, {
                DayAgent: 1,
                HumanCatalogAgent: 1,
                PhysicsAgent: 1,
                BankAgent: 1,
                HouseAgent: 1,
                BulletinBoardAgent: 1,
                ToiletAgent: 1,
                HumanAgent: 2,
                TickAgent: 1,
            });
            const agents = await (await fetch(`${running.url}/api/agents?pageSize=20`)).json();

            const human = agents.items.find((agent: { type: string }) => agent.type === 'HumanAgent');
            assert.equal(human.alive, true);
            assert.equal(typeof human.details.name, 'string');
            assert.ok(['спит', 'активен', 'в туалете', 'идёт в туалет', 'принимает пищу'].includes(human.details.state));

            const html = await (await fetch(running.url)).text();
            assert.match(html, /AgentsWorld — дашборд/);
        } finally {
            await running.stop();
        }

        assert.equal(running.world.state().running, false);
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

    it('туалет стоит отдельно от домов и людей', async () => {
        const running = await startServer(createServerConfig({ PORT: '0', HUMANS: '4', TICK_MS: '100' }));

        try {
            await new Promise((resolve) => setTimeout(resolve, 700));
            const physics = await (await fetch(`${running.url}/api/physics`)).json();
            const key = (point: { x: number; y: number; z: number }): string => `${point.x}|${point.y}|${point.z}`;
            const toilet = physics.bodies.find((body: { id: string }) => body.id === 'ToiletAgent-1');

            assert.deepEqual(toilet.position, { x: 98, y: 0, z: 98 }, 'туалет стоит в позиции из конфигурации');
            const occupied = [...physics.bodies, ...physics.objects]
                .filter((body: { id: string }) => body.id !== 'ToiletAgent-1')
                .map((body: { position: { x: number; y: number; z: number } }) => key(body.position));

            assert.equal(occupied.includes(key(toilet.position)), false, 'на точке туалета не должно быть домов и людей');
        } finally {
            await running.stop();
        }
    });

    it('отказывает на некорректную позицию туалета', () => {
        assert.throws(() => createServerConfig({ TOILET_POSITION: '10' }), /TOILET_POSITION/);
        assert.throws(() => createServerConfig({ TOILET_POSITION: 'a,b' }), /TOILET_POSITION/);
    });
});
