import { describe, it } from 'node:test';
import { TreeSet } from './TreeSet.js';
import assert from 'node:assert/strict';

describe('TreeSet', () => {
    it('корректный поворот дерева', () => {
        const tree = new TreeSet();
        tree.add(1);
        tree.add(4);
        tree.add(21);
        // 4 потому что балансировка должна сработать
        assert.equal(tree.leader().value, 4);
    });

    it('содержание элемента в множестве', () => {
        const tree = new TreeSet();
        tree.add(1);
        tree.add(4);
        tree.add(21);
        tree.add(7);
        tree.add(22);
        tree.add(25);
        tree.add(10);
        tree.add(26);
        tree.add(27);
        tree.add(28);
        tree.add(11);
        tree.add(12);

        assert.equal(tree.contains(4), true, 'contains 4');
        assert.equal(tree.contains(19), false, 'contains 19');
        assert.equal(tree.contains(21), true, 'contains 21');
        assert.equal(tree.contains(12), true, 'contains 12');
    });

    it('корректная балансировка', () => {
        const tree = new TreeSet();
        tree.add(1);
        tree.add(4);
        tree.add(21);
        tree.add(7);
        tree.add(19);
        tree.add(22);

        assert.equal(tree.leader().subtreeHeight, 3, 'высота поддерева 3');
    });

    it('удаление элемента справа', () => {
        const tree = new TreeSet();
        tree.add(1);
        tree.add(4);
        tree.add(21);

        assert.equal(tree.contains(21), true, '21 в дереве')
        tree.delete(21);

        assert.equal(tree.contains(21), false, '21 уже нет в дереве')
    })

    it('самый левый узел', () => {
        const tree = new TreeSet();

        tree.add(1);
        tree.add(4);
        tree.add(7);
        tree.add(21);

        const leftMost = tree.findLeftMostChild(tree.leader());
        assert.equal(leftMost.value, 1);
    });

    it('самый правый узел', () => {
        const tree = new TreeSet();

        tree.add(1);
        tree.add(4);
        tree.add(7);
        tree.add(21);

        const leftMost = tree.findRightMostChild(tree.leader());
        assert.equal(leftMost.value, 21);
    });

    it('удаление элемента с двумя потомками', () => {
        const tree = new TreeSet();
        tree.add(1);
        tree.add(4);
        tree.add(7);
        tree.add(21);

        assert.equal(tree.contains(4), true, '4 в дереве')
        tree.delete(4);

        assert.equal(tree.contains(4), false, '4 уже нет в дереве')
    });

    it('Пропажа единички, удаление + перебалансировка', () => {
        const tree = new TreeSet();
        tree.add(21);
        tree.add(4);
        tree.add(7);
        tree.add(1);
        tree.add(27);
        tree.add(28);
        tree.delete(7);
        tree.delete(21);

        assert.equal(tree.contains(1), true, '1 в дереве')
    });

    // TODO проверить более сложные случаи с удалением и перебалансировкой
});
