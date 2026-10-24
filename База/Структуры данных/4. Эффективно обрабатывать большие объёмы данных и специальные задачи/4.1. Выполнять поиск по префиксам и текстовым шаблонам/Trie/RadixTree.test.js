import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RadixTree } from './RadixTree.js';

describe('RadixTree', () => {
    it('пустое дерево', () => {
        const tree = new RadixTree();

        assert.equal(tree.size, 0);
        assert.equal(tree.isEmpty(), true);
        assert.deepEqual(tree.words(), []);
        assert.equal(tree.search('a'), false);
        assert.equal(tree.startsWith(''), false);
    });

    it('вставка и поиск слова', () => {
        const tree = new RadixTree();
        tree.insert('romane');
        tree.insert('romanus');
        tree.insert('rubens');

        assert.equal(tree.search('romane'), true);
        assert.equal(tree.search('romanus'), true);
        assert.equal(tree.search('rubens'), true);
        assert.equal(tree.search('roman'), false, 'префикс не является словом');
        assert.equal(tree.search('rub'), false);
        assert.equal(tree.search(''), false);
    });

    it('сжимает цепочки узлов в рёбра (меньше узлов, чем в trie)', () => {
        const tree = new RadixTree();
        tree.insert('romane');
        tree.insert('romanus');

        // root -> "roman" -> "e", "us": всего 4 узла,
        // тогда как обычный trie занимал бы 9 узлов.
        assert.equal(tree.nodeCount(), 4);
    });

    it('startsWith, в том числе когда префикс заканчивается в середине ребра', () => {
        const tree = new RadixTree();
        tree.insert('romane');
        tree.insert('romanus');

        assert.equal(tree.startsWith('rom'), true);
        assert.equal(tree.startsWith('roma'), true);
        assert.equal(tree.startsWith('roman'), true);
        assert.equal(tree.startsWith('romane'), true);
        assert.equal(tree.startsWith('romanus'), true);
        assert.equal(tree.startsWith('ro'), true);
        assert.equal(tree.startsWith('rub'), false);
        assert.equal(tree.startsWith(''), true);
    });

    it('wordsWithPrefix, в том числе префикс в середине ребра', () => {
        const tree = new RadixTree();
        tree.insert('romane');
        tree.insert('romanus');
        tree.insert('rubens');

        assert.deepEqual(tree.wordsWithPrefix('rom'), ['romane', 'romanus']);
        assert.deepEqual(tree.wordsWithPrefix('roman'), ['romane', 'romanus']);
        assert.deepEqual(tree.wordsWithPrefix('romane'), ['romane']);
        assert.deepEqual(tree.wordsWithPrefix('rub'), ['rubens']);
        assert.deepEqual(tree.wordsWithPrefix('z'), []);
    });

    it('words возвращает все слова в алфавитном порядке', () => {
        const tree = new RadixTree();
        tree.insert('banana');
        tree.insert('apple');
        tree.insert('cherry');

        assert.deepEqual(tree.words(), ['apple', 'banana', 'cherry']);
    });

    it('удаление слова со слиянием рёбер', () => {
        const tree = new RadixTree();
        tree.insert('romane');
        tree.insert('romanus');

        assert.equal(tree.delete('romanus'), true);
        assert.equal(tree.search('romanus'), false);
        assert.equal(tree.search('romane'), true);
        assert.equal(tree.size, 1);
        // После удаления осталось единственное ребро root -> "romane".
        assert.deepEqual(tree.words(), ['romane']);
    });

    it('удаление слова-префикса другого слова', () => {
        const tree = new RadixTree();
        tree.insert('roman');
        tree.insert('romane');

        assert.equal(tree.delete('roman'), true);
        assert.equal(tree.search('roman'), false);
        assert.equal(tree.search('romane'), true);
        assert.deepEqual(tree.words(), ['romane']);
    });

    it('удаление несуществующего слова возвращает false', () => {
        const tree = new RadixTree();
        tree.insert('roman');

        assert.equal(tree.delete('romanus'), false);
        assert.equal(tree.delete('rom'), false, 'префикс не является словом');
        assert.equal(tree.size, 1);
    });

    it('повторная вставка не увеличивает size', () => {
        const tree = new RadixTree();
        tree.insert('roman');
        tree.insert('roman');

        assert.equal(tree.size, 1);
    });

    it('значение, привязанное к слову', () => {
        const tree = new RadixTree();
        tree.insert('one', 1);
        tree.insert('two', 2);

        assert.equal(tree.get('one'), 1);
        assert.equal(tree.get('two'), 2);
        assert.equal(tree.get('three'), undefined);

        tree.insert('one', 111);
        assert.equal(tree.get('one'), 111);
        assert.equal(tree.size, 2);
    });
});
