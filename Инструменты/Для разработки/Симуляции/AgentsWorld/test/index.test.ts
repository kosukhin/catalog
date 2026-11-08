import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ECHO_AGENT_TYPE,
    EchoAgent,
    World,
    createDefaultRegistry,
    createMessage,
    isMessage,
} from '../src/index.ts';

describe('index', () => {
    it('публичный API отдаёт мир, реестр и агента', () => {
        assert.equal(ECHO_AGENT_TYPE, 'EchoAgent');
        assert.equal(new EchoAgent().type, ECHO_AGENT_TYPE);
        assert.equal(createDefaultRegistry().has(ECHO_AGENT_TYPE), true);
        assert.equal(isMessage(createMessage('ping')), true);
    });

    it('мир из одного агента запускается и останавливается через публичный API', async () => {
        const world = new World({ [ECHO_AGENT_TYPE]: 1 }, { print: () => {}, threadPoolSize: 1 });

        await world.run();
        assert.equal(world.running, true);

        await world.stop();
        assert.equal(world.running, false);
    });
});
