import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as agents from '../agents/index.ts';
import { assertAgentPlugin } from '../lib/agentPlugin.ts';

describe('agents index', () => {
    it('собирает все модули агентов мира', () => {
        assert.deepEqual(Object.keys(agents).sort(), ['bankAgent', 'bulletinBoardAgent', 'dayAgent', 'houseAgent', 'humanAgent', 'humanCatalogAgent', 'physicsAgent', 'tickAgent', 'toiletAgent']);
    });

    it('каждый модуль подходит для состава мира', () => {
        for (const [name, plugin] of Object.entries(agents)) {
            const checked = assertAgentPlugin(plugin);
            assert.equal(typeof checked.type, 'string', `${name}: нет type`);
            assert.match(checked.moduleUrl, /\.ts$/, `${name}: нет адреса модуля`);
            assert.equal(typeof checked.createAgent, 'function', `${name}: нет createAgent`);
        }
    });

    it('типы агентов не повторяются', () => {
        const types = Object.values(agents).map((plugin) => plugin.type);

        assert.deepEqual(types, ['BankAgent', 'BulletinBoardAgent', 'DayAgent', 'HouseAgent', 'HumanAgent', 'HumanCatalogAgent', 'PhysicsAgent', 'TickAgent', 'ToiletAgent']);
        assert.equal(new Set(types).size, types.length);
    });
});
