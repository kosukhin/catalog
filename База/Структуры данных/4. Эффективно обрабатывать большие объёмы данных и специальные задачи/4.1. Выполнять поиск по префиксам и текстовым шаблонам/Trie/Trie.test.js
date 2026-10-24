import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Trie } from './Trie.js';

describe('Trie', () => {
    it('пустое дерево', () => {
        const trie = new Trie();

        assert.equal(trie.size, 0);
        assert.equal(trie.isEmpty(), true);
        assert.deepEqual(trie.words(), []);
        assert.equal(trie.search('a'), false);
        assert.equal(trie.startsWith(''), false);
        assert.deepEqual(trie.wordsWithPrefix('a'), []);
    });

    it('вставка и поиск слова', () => {
        const trie = new Trie();
        trie.insert('cat');
        trie.insert('car');
        trie.insert('dog');

        assert.equal(trie.search('cat'), true);
        assert.equal(trie.search('car'), true);
        assert.equal(trie.search('dog'), true);
        assert.equal(trie.search('ca'), false, 'префикс не является словом');
        assert.equal(trie.search('cats'), false);
        assert.equal(trie.search(''), false);
    });

    it('startsWith проверяет наличие префикса', () => {
        const trie = new Trie();
        trie.insert('apple');
        trie.insert('application');

        assert.equal(trie.startsWith('app'), true);
        assert.equal(trie.startsWith('apple'), true);
        assert.equal(trie.startsWith('apx'), false);
        assert.equal(trie.startsWith(''), true);
    });

    it('wordsWithPrefix возвращает слова по префиксу', () => {
        const trie = new Trie();
        for (const w of ['cat', 'car', 'cart', 'dog', 'dot']) {
            trie.insert(w);
        }

        assert.deepEqual(trie.wordsWithPrefix('ca'), ['car', 'cart', 'cat']);
        assert.deepEqual(trie.wordsWithPrefix('car'), ['car', 'cart']);
        assert.deepEqual(trie.wordsWithPrefix('do'), ['dog', 'dot']);
        assert.deepEqual(trie.wordsWithPrefix('z'), []);
    });

    it('words возвращает все слова в алфавитном порядке', () => {
        const trie = new Trie();
        trie.insert('banana');
        trie.insert('apple');
        trie.insert('cherry');

        assert.deepEqual(trie.words(), ['apple', 'banana', 'cherry']);
    });

    it('удаление слова', () => {
        const trie = new Trie();
        trie.insert('cat');
        trie.insert('car');
        trie.insert('cart');

        assert.equal(trie.delete('cat'), true);
        assert.equal(trie.search('cat'), false);
        assert.equal(trie.search('car'), true);
        assert.equal(trie.search('cart'), true);
        assert.equal(trie.size, 2);
    });

    it('удаление несуществующего слова возвращает false', () => {
        const trie = new Trie();
        trie.insert('cat');

        assert.equal(trie.delete('dog'), false);
        assert.equal(trie.delete('ca'), false, 'префикс не является словом');
        assert.equal(trie.size, 1);
    });

    it('повторная вставка не увеличивает size', () => {
        const trie = new Trie();
        trie.insert('cat');
        trie.insert('cat');

        assert.equal(trie.size, 1);
        assert.deepEqual(trie.words(), ['cat']);
    });

    it('значение, привязанное к слову', () => {
        const trie = new Trie();
        trie.insert('one', 1);
        trie.insert('two', 2);

        assert.equal(trie.get('one'), 1);
        assert.equal(trie.get('two'), 2);
        assert.equal(trie.get('three'), undefined);

        // перезапись значения
        trie.insert('one', 111);
        assert.equal(trie.get('one'), 111);
        assert.equal(trie.size, 2);
    });

    it('количество узлов больше, чем слов (обычный trie не сжимает)', () => {
        const trie = new Trie();
        trie.insert('romane');
        trie.insert('romanus');

        // корень + r + o + m + a + n + e + u + s = 9 узлов
        assert.equal(trie.nodeCount(), 9);
    });
});
