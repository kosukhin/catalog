import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPhysicsState, loadWorldClock, toClock } from '../client/physicsApi.ts';
import { loadAgentNames, toNames } from '../client/physics/names.ts';
import { defaultFetcher } from '../client/physics/fetcher.ts';

describe('physicsApi', () => {
    it('загружает состояние физики по адресу', async () => {
        const state = { speed: 5, bodies: [], moving: [] };
        const calls: string[] = [];

        const result = await loadPhysicsState('/api/physics', async (url) => {
            calls.push(url);
            return { json: async () => state };
        });

        assert.deepEqual(calls, ['/api/physics']);
        assert.deepEqual(result, state);
    });

    it('пробрасывает ошибку загрузки', async () => {
        await assert.rejects(
            () =>
                loadPhysicsState('/api/physics', async () => {
                    throw new Error('сеть недоступна');
                }),
            /сеть недоступна/,
        );
    });

    it('собирает имена агентов по их адресам', () => {
        const names = toNames({
            items: [
                { id: 'HumanAgent-1', type: 'HumanAgent', details: { name: 'Иван', state: 'активен' } },
                { id: 'HumanAgent-2', type: 'HumanAgent', details: { name: 'Анна' } },
            ],
        });

        assert.deepEqual(names, { 'HumanAgent-1': 'Иван', 'HumanAgent-2': 'Анна' });
    });

    it('пропускает агентов без имени и не падает на чужом ответе', () => {
        assert.deepEqual(
            toNames({
                items: [
                    { id: 'PhysicsAgent-1', details: { speed: 5 } },
                    { id: 'HumanAgent-3', details: { name: '  ' } },
                    { id: 'HumanAgent-4' },
                    { details: { name: 'Безымянный' } },
                ],
            }),
            {},
        );
        assert.deepEqual(toNames({ error: 'нет данных' }), {});
        assert.deepEqual(toNames(null), {});
    });

    it('загружает имена с отдельного адреса', async () => {
        const calls: string[] = [];

        const names = await loadAgentNames('/api/agents?pageSize=200', async (url) => {
            calls.push(url);
            return { json: async () => ({ items: [{ id: 'HumanAgent-7', details: { name: 'Ольга' } }] }) };
        });

        assert.deepEqual(calls, ['/api/agents?pageSize=200']);
        assert.deepEqual(names, { 'HumanAgent-7': 'Ольга' });
    });

    it('загружает время мира с отдельного адреса', async () => {
        const calls: string[] = [];
        const report = { hours: 7, minutes: 5, phase: 'день' };

        const clock = await loadWorldClock('/api/clock', async (url) => {
            calls.push(url);
            return { json: async () => ({ clock: report }) };
        });

        assert.deepEqual(calls, ['/api/clock']);
        assert.deepEqual(clock, report);
    });

    it('возвращает null, если часы мира не ответили', async () => {
        assert.equal(await loadWorldClock('/api/clock', async () => ({ json: async () => ({ clock: null }) })), null);
    });

    it('не падает на чужом ответе часов', () => {
        assert.equal(toClock({ clock: null }), null);
        assert.equal(toClock({ clock: 'полдень' }), null);
        assert.equal(toClock({ clock: { minutes: 5 } }), null);
        assert.equal(toClock({ clock: { hours: 7 } }), null);
        assert.equal(toClock({ error: 'нет данных' }), null);
        assert.equal(toClock(null), null);
    });
});
