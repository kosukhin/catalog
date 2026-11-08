import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadAgentFactory } from '../lib/agentLoader.ts';

/** Адрес настоящего модуля агента: загрузчик должен достать из него createAgent. */
const agentModuleUrl = new URL('../agents/echoAgent.ts', import.meta.url).href;
/** Модуль без createAgent: на нём проверяем понятность ошибки. */
const moduleWithoutFactory = new URL('../lib/actor.ts', import.meta.url).href;

describe('agentLoader', () => {
    it('загружает createAgent из модуля агента', async () => {
        const createAgent = await loadAgentFactory(agentModuleUrl);
        const actor = createAgent('EchoAgent-1', { greetings: 0 });

        assert.equal(typeof createAgent, 'function');
        assert.equal(actor.type, 'EchoAgent');
    });

    it('кэширует фабрику: повторная загрузка не грузит модуль заново', () => {
        assert.equal(loadAgentFactory(agentModuleUrl), loadAgentFactory(agentModuleUrl));
    });

    it('сообщает адрес модуля, если тот не загрузился', async () => {
        await assert.rejects(
            () => loadAgentFactory('file:///нет/такого/модуля.ts'),
            /не удалось загрузить модуль агента file:\/\/\/нет\/такого\/модуля\.ts/,
        );
    });

    it('требует экспорт createAgent', async () => {
        await assert.rejects(
            () => loadAgentFactory(moduleWithoutFactory),
            /нет экспорта createAgent/,
        );
    });
});
