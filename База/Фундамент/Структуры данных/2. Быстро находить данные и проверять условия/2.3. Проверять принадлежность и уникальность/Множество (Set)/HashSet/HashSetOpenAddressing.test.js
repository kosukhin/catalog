import { describe, it } from 'node:test';
import { createHashSetOpenAddressing, quadraticProbing } from './HashSetOpenAddressing.js';
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

    it('Квадратичное пробирование не теряет значения', () => {
        const set = createHashSetOpenAddressing(
            murmurHash3,
            10,
            quadraticProbing
        );

        const values = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105];
        for (const v of values) {
            set.add(v);
        }

        assert.equal(set.size, values.length);
        for (const v of values) {
            assert.equal(set.contains(v), true, `потеряно значение ${v}`);
        }
        assert.deepEqual(set.values().sort((a, b) => a - b), values.sort((a, b) => a - b));
    });

    it('неполное покрытие: rehash спасает значение', () => {
        const set = createHashSetOpenAddressing(() => 0, 8, quadraticProbing, 1.0);

        for (let i = 0; i < 3; i++) set.add(i + 100);

        set.add(42);
        assert.equal(set.contains(42), true);
    });
});

