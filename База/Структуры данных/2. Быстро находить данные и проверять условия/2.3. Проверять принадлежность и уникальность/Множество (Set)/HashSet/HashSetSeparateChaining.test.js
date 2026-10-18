import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TreeSet } from './TreeSet.js';

describe('HashSetSeparateChaining', () => {
    it('Добавление элементов', () => {
        const tree = new TreeSet();
        tree.add(1);
        tree.add(4);
        tree.add(21);
        // 4 потому что балансировка должна сработать
        assert.equal(tree.leader().value, 4);
    });
});
