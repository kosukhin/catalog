import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadPhysicsState } from '../client/physicsApi.ts';

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
});
