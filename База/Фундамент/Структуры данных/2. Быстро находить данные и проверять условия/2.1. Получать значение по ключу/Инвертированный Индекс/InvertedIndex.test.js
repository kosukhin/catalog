import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InvertedIndex } from './InvertedIndex.js';

describe('InvertedIndex', () => {
    it('пустой индекс', () => {
        const index = new InvertedIndex();

        assert.equal(index.size(), 0);
        assert.deepEqual(index.terms(), []);
        assert.deepEqual(index.documents(), []);
        assert.deepEqual(index.search('привет'), []);
        assert.equal(index.has('привет'), false);
    });

    it('добавление документа и поиск по одному слову', () => {
        const index = new InvertedIndex();
        index.addDocument(1, 'привет мир');
        index.addDocument(2, 'привет вселенная');

        assert.deepEqual(index.search('привет'), [1, 2]);
        assert.deepEqual(index.search('мир'), [1]);
        assert.deepEqual(index.search('вселенная'), [2]);
        assert.deepEqual(index.search('нет'), []);
    });

    it('токенизация: регистр и знаки препинания не важны', () => {
        const index = new InvertedIndex();
        index.addDocument(1, 'Привет, Мир!');
        index.addDocument(2, 'привет мир');

        assert.deepEqual(index.search('привет'), [1, 2]);
        assert.deepEqual(index.search('мир'), [1, 2]);
        assert.deepEqual(index.search('Привет'), [1, 2]);
    });

    it('повтор слова в документе не дублирует постинг', () => {
        const index = new InvertedIndex();
        index.addDocument(1, 'слово слово слово');

        assert.equal(index.documentFrequency('слово'), 1);
        assert.deepEqual(index.search('слово'), [1]);
    });

    it('documentFrequency считает количество документов', () => {
        const index = new InvertedIndex();
        index.addDocument(1, 'a b c');
        index.addDocument(2, 'a b');
        index.addDocument(3, 'a');

        assert.equal(index.documentFrequency('a'), 3);
        assert.equal(index.documentFrequency('b'), 2);
        assert.equal(index.documentFrequency('c'), 1);
        assert.equal(index.documentFrequency('z'), 0);
    });

    it('поиск по пересечению (AND)', () => {
        const index = new InvertedIndex();
        index.addDocument(1, 'красная машина');
        index.addDocument(2, 'синяя машина');
        index.addDocument(3, 'красная ручка');

        assert.deepEqual(index.searchAll(['красная', 'машина']), [1]);
        assert.deepEqual(index.searchAll(['машина']), [1, 2]);
        assert.deepEqual(index.searchAll(['красная', 'синяя']), []);
    });

    it('поиск по объединению (OR)', () => {
        const index = new InvertedIndex();
        index.addDocument(1, 'яблоко');
        index.addDocument(2, 'груша');
        index.addDocument(3, 'слива');

        assert.deepEqual(index.searchAny(['яблоко', 'груша']), [1, 2]);
        assert.deepEqual(index.searchAny(['арбуз']), []);
    });

    it('terms возвращает отсортированные термины', () => {
        const index = new InvertedIndex();
        index.addDocument(1, 'банан яблоко апельсин');

        assert.deepEqual(index.terms(), ['апельсин', 'банан', 'яблоко']);
    });

    it('documents возвращает отсортированные id документов', () => {
        const index = new InvertedIndex();
        index.addDocument(3, 'один');
        index.addDocument(1, 'два');
        index.addDocument(2, 'три');

        assert.deepEqual(index.documents(), [1, 2, 3]);
    });

    it('кастомная токенизация', () => {
        const index = new InvertedIndex({
            tokenize: (text) => text.split(',').map((t) => t.trim()).filter(Boolean),
        });
        index.addDocument(1, 'яблоко, груша');

        assert.deepEqual(index.search('яблоко'), [1]);
        assert.deepEqual(index.search('груша'), [1]);
    });
});
