import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertAgentPlugin, type AgentPlugin } from '../lib/agentPlugin.ts';

/** Заглушка модуля агента: настоящие поля контракта, без реального агента. */
function createPlugin(overrides: Partial<AgentPlugin> = {}): AgentPlugin {
    return {
        type: 'Заглушка',
        moduleUrl: 'file:///заглушка.ts',
        createAgent: () => ({ type: 'Заглушка', receive: () => {} }),
        ...overrides,
    };
}

describe('agentPlugin', () => {
    it('принимает модуль с type, moduleUrl и createAgent', () => {
        const plugin = createPlugin();

        assert.equal(assertAgentPlugin(plugin), plugin);
    });

    it('объясняет, чего не хватает в модуле агента', () => {
        assert.throws(() => assertAgentPlugin(null), /должен быть объектом/);
        assert.throws(() => assertAgentPlugin({}), /нет строкового экспорта type/);
        assert.throws(() => assertAgentPlugin({ type: 'X' }), /нет строкового экспорта moduleUrl/);
        assert.throws(() => assertAgentPlugin({ type: 'X', moduleUrl: 'file:///x.ts' }), /нет функции createAgent/);
        assert.throws(
            () => assertAgentPlugin({ type: '  ', moduleUrl: 'file:///x.ts', createAgent: () => ({}) }),
            /нет строкового экспорта type/,
        );
    });

    it('принимает модуль любого типа: ядро не знает конкретных агентов', () => {
        const plugin = createPlugin({ type: 'СовсемДругой', moduleUrl: 'file:///другой.ts' });

        assert.equal(assertAgentPlugin(plugin).moduleUrl, 'file:///другой.ts');
    });
});
