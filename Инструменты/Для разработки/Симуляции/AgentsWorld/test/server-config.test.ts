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
        const counts = [...config.population.values()];
        const types = [...config.population.keys()].map((plugin) => plugin.type);

        assert.deepEqual(types, ['DayAgent', 'HumanCatalogAgent', 'HumanAgent']);
        assert.deepEqual(counts, [1, 1, 7]);
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

    it('отвергает некорректные значения', () => {
        assert.throws(() => createServerConfig({ PORT: 'сто' }), /PORT должен быть целым числом от 0 до 65535/);
        assert.throws(() => createServerConfig({ PORT: '70000' }), /PORT должен быть целым числом/);
        assert.throws(() => createServerConfig({ HUMANS: '0' }), /HUMANS должен быть целым числом от 1 до 5000/);
        assert.throws(() => createServerConfig({ PAGE_SIZE: '1.5' }), /PAGE_SIZE должен быть целым числом/);
    });
});
