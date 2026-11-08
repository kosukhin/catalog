import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertAgentPlugin, toModuleMap, type AgentPlugin } from '../lib/agentPlugin.ts';

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

    it('строит карту «тип → адрес модуля»', () => {
        const modules = toModuleMap([createPlugin(), createPlugin({ type: 'Второй', moduleUrl: 'file:///2.ts' })]);

        assert.equal(modules.get('Заглушка'), 'file:///заглушка.ts');
        assert.equal(modules.get('Второй'), 'file:///2.ts');
        assert.equal(modules.size, 2);
    });

    it('не даёт подключить один тип дважды', () => {
        assert.throws(() => toModuleMap([createPlugin(), createPlugin()]), /«Заглушка» подключён дважды/);
    });

    it('пустой список модулей — пустая карта', () => {
        assert.equal(toModuleMap([]).size, 0);
    });
});
