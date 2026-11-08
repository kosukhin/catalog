import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../lib/index.ts';
import { ECHO_AGENT_TYPE, EchoAgent } from '../agents/echoAgent.ts';

describe('index', () => {
    it('публичный API отдаёт мир, реестр и протокол', () => {
        assert.equal(typeof api.World, 'function');
        assert.equal(typeof api.createDefaultRegistry, 'function');
        assert.equal(api.isMessage(api.createMessage('ping')), true);
    });

    it('агенты не реэкспортируются из lib: они живут в agents/', () => {
        assert.equal('EchoAgent' in api, false, 'EchoAgent не должен быть в публичном API lib');
        assert.equal('ECHO_AGENT_TYPE' in api, false, 'ECHO_AGENT_TYPE не должен быть в публичном API lib');
        assert.equal(ECHO_AGENT_TYPE, 'EchoAgent');
        assert.equal(new EchoAgent().type, ECHO_AGENT_TYPE);
    });

    it('реестр из lib знает агента из agents/', () => {
        assert.equal(api.createDefaultRegistry().has(ECHO_AGENT_TYPE), true);
    });

    it('мир из одного агента запускается и останавливается через публичный API', async () => {
        const world = new api.World({ [ECHO_AGENT_TYPE]: 1 }, { print: () => {}, threadPoolSize: 1 });

        await world.run();
        assert.equal(world.running, true);

        await world.stop();
        assert.equal(world.running, false);
    });
});
