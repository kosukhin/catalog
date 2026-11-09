import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createScene } from '../client/physicsScene.ts';

describe('physicsScene', () => {
    it('экспортирует сборку сцены three.js', () => {
        assert.equal(typeof createScene, 'function');
    });
});
