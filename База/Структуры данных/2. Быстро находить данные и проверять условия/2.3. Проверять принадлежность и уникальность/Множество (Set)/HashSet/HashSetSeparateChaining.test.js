import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HashSetSeparateChaining } from './HashSetSeparateChaining.js';
import { murmurHash3 } from 'determinism';

describe('HashSetSeparateChaining', () => {
    it('Добавление элементов', () => {
        const hash = new HashSetSeparateChaining(murmurHash3, 8);
        hash.add(1);
        hash.add(4);
        hash.add(21);
        // 4 потому что балансировка должна сработать
        assert.equal(hash.contains(4), true);
    });
});
