import { describe, it } from 'node:test';
import { createHashSetOpenAddressing } from './HashSetOpenAddressing.js';
import { murmurHash3 } from 'determinism';
import assert from 'node:assert/strict';

describe('HashSetOpenAddressing', () => {
    it('Добавление элементов', () => {
        const set = createHashSetOpenAddressing(
            murmurHash3,
            10
        );

        set.add(22);
        set.add(12);

        assert.equal(set.contains(4), false);
        assert.equal(set.contains(12), true);
    });
});
