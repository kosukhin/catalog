import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../lib/index.ts';
import * as echoAgent from '../agents/echoAgent.ts';

describe('index', () => {
    it('публичный API отдаёт мир и протокол', () => {
        assert.equal(typeof api.World, 'function');
        assert.equal(api.isMessage(api.createMessage('ping')), true);
    });

    it('ядро не знает ни об одном агенте', () => {
        assert.equal('EchoAgent' in api, false, 'EchoAgent не должен быть в публичном API lib');
        assert.equal('createDefaultRegistry' in api, false, 'реестра в lib больше нет');
        assert.equal('AgentRegistry' in api, false, 'реестра в lib больше нет');
    });

    it('модуль агента сам сообщает тип и адрес, по которому его грузить', () => {
        assert.equal(echoAgent.type, 'EchoAgent');
        assert.match(echoAgent.moduleUrl, /agents\/echoAgent\.ts$/);
        assert.equal(typeof echoAgent.createAgent, 'function');
    });

    it('мир из одного агента запускается и останавливается через публичный API', async () => {
        const world = new api.World(new Map([[echoAgent, 1]]), { print: () => {}, threadPoolSize: 1 });

        await world.run();
        assert.equal(world.state().running, true);

        await world.stop();
        assert.equal(world.state().running, false);
    });
});

