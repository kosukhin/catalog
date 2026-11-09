import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServerConfig } from '../server/config.ts';

describe('server config', () => {
    it('по умолчанию: порт 3000, 12 человек, страница 20', () => {
        const config = createServerConfig({});

        assert.equal(config.port, 3000);
        assert.equal(config.humans, 12);
        assert.equal(config.pageSize, 20);
        assert.equal(config.clockId, 'DayAgent-1');
    });

    it('состав мира: по одному DayAgent и каталогу плюс люди', () => {
        const config = createServerConfig({ HUMANS: '7' });
        const counts = [...config.population.values()].map((entry) => (typeof entry === 'number' ? entry : entry.count));
        const types = [...config.population.keys()].map((plugin) => plugin.type);

        assert.deepEqual(types, ['DayAgent', 'HumanCatalogAgent', 'HumanAgent', 'TickAgent']);
        assert.deepEqual(counts, [1, 1, 7, 1]);
    });

    it('читает переменные окружения', () => {
        const config = createServerConfig({ PORT: '0', HUMANS: '3', PAGE_SIZE: '50' });

        assert.equal(config.port, 0);
        assert.equal(config.humans, 3);
        assert.equal(config.pageSize, 50);
    });

    it('пустые переменные считаются незаданными', () => {
        const config = createServerConfig({ PORT: '  ', HUMANS: '' });

        assert.equal(config.port, 3000);
        assert.equal(config.humans, 12);
    });

    it('передаёт темп времени настройками агента', () => {
        const config = createServerConfig({ TIME_SCALE: '60' });
        const clockEntry = [...config.population.entries()].find(([plugin]) => plugin.type === 'DayAgent')?.[1];

        assert.equal(config.timeScale, 60);
        assert.deepEqual(clockEntry, { count: 1, options: { timeScale: 60 } });
    });

    it('по умолчанию время идёт в 800 раз быстрее', () => {
        const config = createServerConfig({});
        const clockEntry = [...config.population.entries()].find(([plugin]) => plugin.type === 'DayAgent')?.[1];

        assert.equal(config.timeScale, 800);
        assert.deepEqual(clockEntry, { count: 1, options: { timeScale: 800 } });
    });

    it('отвергает некорректный темп времени', () => {
        assert.throws(() => createServerConfig({ TIME_SCALE: '0' }), /TIME_SCALE должен быть положительным числом/);
        assert.throws(() => createServerConfig({ TIME_SCALE: '-3' }), /TIME_SCALE должен быть положительным числом/);
        assert.throws(() => createServerConfig({ TIME_SCALE: 'быстро' }), /TIME_SCALE должен быть положительным числом/);
    });

    it('отвергает некорректные значения', () => {
        assert.throws(() => createServerConfig({ PORT: 'сто' }), /PORT должен быть целым числом от 0 до 65535/);
        assert.throws(() => createServerConfig({ PORT: '70000' }), /PORT должен быть целым числом/);
        assert.throws(() => createServerConfig({ HUMANS: '0' }), /HUMANS должен быть целым числом от 1 до 5000/);
        assert.throws(() => createServerConfig({ PAGE_SIZE: '1.5' }), /PAGE_SIZE должен быть целым числом/);
    });

    it('настраивает тикер по типам агентов', () => {
        const config = createServerConfig({ HUMANS: '3', TICK_MS: '250' });
        const tickEntry = [...config.population.entries()].find(([plugin]) => plugin.type === 'TickAgent')?.[1];

        assert.equal(config.tickMs, 250);
        assert.deepEqual(tickEntry, { count: 1, options: { intervalMs: 250, types: ['HumanAgent'] } });
    });

    it('по умолчанию тикер будит людей раз в секунду', () => {
        const config = createServerConfig({ HUMANS: '2' });
        const tickEntry = [...config.population.entries()].find(([plugin]) => plugin.type === 'TickAgent')?.[1];

        assert.equal(config.tickMs, 1000);
        assert.deepEqual(tickEntry, { count: 1, options: { intervalMs: 1000, types: ['HumanAgent'] } });
    });

    it('отвергает некорректный период тика', () => {
        assert.throws(() => createServerConfig({ TICK_MS: '0' }), /TICK_MS должен быть целым числом от 10 до 600000/);
        assert.throws(() => createServerConfig({ TICK_MS: 'быстро' }), /TICK_MS должен быть целым числом/);
    });
});
