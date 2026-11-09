import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startPhysicsView } from '../client/physicsMain.ts';

describe('physicsMain', () => {
    it('экспортирует запуск страницы физики', () => {
        assert.equal(typeof startPhysicsView, 'function');
    });
});
