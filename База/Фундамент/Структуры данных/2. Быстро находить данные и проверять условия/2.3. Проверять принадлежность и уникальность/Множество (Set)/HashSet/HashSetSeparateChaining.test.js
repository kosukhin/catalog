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

        assert.equal(hash.contains(4), true);
    });

    it('Достижение лоад фактора', () => {
        const hash = new HashSetSeparateChaining(murmurHash3, 4);
        hash.add(1);
        hash.add(4);
        hash.add(21);

        assert.equal(hash.size, 8, 'Удвоился размер хэш сета');
    });

    it('Размер хэш сета корректный', () => {
        const hash = new HashSetSeparateChaining(murmurHash3, 8);
        hash.add(1);
        hash.add(4);
        hash.add(21);

        assert.equal(hash.elementsCount(), 3, '3 элемента в множестве');
    })

    it('Удаление элемента', () => {
        const hash = new HashSetSeparateChaining(murmurHash3, 8);
        hash.add(1);
        hash.add(4);
        hash.add(21);

        hash.remove(4);

        assert.equal(hash.contains(4), false, '4 больше не в множестве');
    })

    it('Коллизия, плохая хэш функция', () => {
        const hash = new HashSetSeparateChaining(() => 1, 6);
        hash.add(1);
        hash.add(4);
        hash.add(21);
        hash.add(42);

        assert.equal(
            [hash.contains(1), hash.contains(4), hash.contains(21), hash.contains(42)].every(Boolean),
            true,
            'Все элементы есть в множестве'
        );
    })
});
