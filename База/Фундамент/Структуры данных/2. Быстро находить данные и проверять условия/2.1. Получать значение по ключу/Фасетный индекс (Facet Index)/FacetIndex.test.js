import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FacetIndex } from './FacetIndex.js';

/**
 * Каталог из трёх товаров — общий пример для большинства тестов.
 * @returns {FacetIndex}
 */
function createCatalog() {
    return new FacetIndex()
        .addDocument(1, { brand: 'apple', color: 'black', size: 6 })
        .addDocument(2, { brand: 'samsung', color: 'black', size: 7 })
        .addDocument(3, { brand: 'apple', color: 'white', size: 6 });
}

describe('FacetIndex', () => {
    it('пустой индекс', () => {
        const index = new FacetIndex();

        assert.equal(index.size(), 0);
        assert.equal(index.has(1), false);
        assert.deepEqual(index.documents(), []);
        assert.deepEqual(index.fields(), []);
        assert.deepEqual(index.values('brand'), []);
        assert.deepEqual(index.search({}), []);
        assert.deepEqual(index.search({ brand: 'apple' }), []);
        assert.deepEqual(index.counts('brand'), []);
        assert.deepEqual(index.topValues('brand', {}, 5), []);
    });

    it('добавление документов и значения фасетов', () => {
        const index = createCatalog();

        assert.equal(index.size(), 3);
        assert.equal(index.has(2), true);
        assert.deepEqual(index.documents(), [1, 2, 3]);
        assert.deepEqual(index.fields(), ['brand', 'color', 'size']);
        assert.deepEqual(index.values('brand'), ['apple', 'samsung']);
        assert.deepEqual(index.values('size'), [6, 7]);
        assert.deepEqual(index.values('unknown'), []);
    });

    it('поиск по одному фасету', () => {
        const index = createCatalog();

        assert.deepEqual(index.search({ color: 'black' }), [1, 2]);
        assert.deepEqual(index.search({ brand: 'apple' }), [1, 3]);
        assert.deepEqual(index.search({ size: 6 }), [1, 3]);
    });

    it('мультивыбор внутри фасета объединяется через OR', () => {
        const index = createCatalog();

        assert.deepEqual(index.search({ brand: ['apple', 'samsung'] }), [1, 2, 3]);
        assert.deepEqual(index.search({ color: ['black', 'white'] }), [1, 2, 3]);
        assert.deepEqual(index.search({ brand: ['apple', 'nokia'] }), [1, 3]);
    });

    it('разные фасеты пересекаются через AND', () => {
        const index = createCatalog();

        assert.deepEqual(index.search({ brand: 'apple', color: 'black' }), [1]);
        assert.deepEqual(
            index.search({ brand: ['apple', 'samsung'], size: 6 }),
            [1, 3]
        );
        assert.deepEqual(index.search({ brand: 'samsung', size: 6 }), []);
    });

    it('неизвестные поле и значение дают пустой результат', () => {
        const index = createCatalog();

        assert.deepEqual(index.search({ brand: 'nokia' }), []);
        assert.deepEqual(index.search({ unknown: 'x' }), []);
        assert.deepEqual(index.counts('unknown'), []);
    });

    it('счётчики без фильтров', () => {
        const index = createCatalog();

        assert.deepEqual(index.counts('brand'), [
            { value: 'apple', count: 2 },
            { value: 'samsung', count: 1 },
        ]);
        assert.deepEqual(index.counts('color'), [
            { value: 'black', count: 2 },
            { value: 'white', count: 1 },
        ]);
        assert.deepEqual(index.counts('size'), [
            { value: 6, count: 2 },
            { value: 7, count: 1 },
        ]);
    });

    it('drill-down: счётчики игнорируют фильтр по своему полю', () => {
        const index = createCatalog();

        // даже при выбранном color=black видны счётчики всех цветов
        assert.deepEqual(index.counts('color', { color: 'black' }), [
            { value: 'black', count: 2 },
            { value: 'white', count: 1 },
        ]);
        assert.deepEqual(index.counts('brand', { brand: 'apple' }), [
            { value: 'apple', count: 2 },
            { value: 'samsung', count: 1 },
        ]);
    });

    it('счётчики учитывают фильтры по другим полям', () => {
        const index = createCatalog();

        assert.deepEqual(index.counts('brand', { color: 'black' }), [
            { value: 'apple', count: 1 },
            { value: 'samsung', count: 1 },
        ]);
        assert.deepEqual(index.counts('color', { brand: 'apple' }), [
            { value: 'black', count: 1 },
            { value: 'white', count: 1 },
        ]);
    });

    it('счётчики сохраняют значения с нулём', () => {
        const index = createCatalog();

        assert.deepEqual(index.counts('size', { brand: 'apple' }), [
            { value: 6, count: 2 },
            { value: 7, count: 0 },
        ]);
    });

    it('счётчики поддерживают мультивыбор в других полях', () => {
        const index = createCatalog();

        assert.deepEqual(
            index.counts('color', { brand: ['apple'], size: 6 }),
            [
                { value: 'black', count: 1 },
                { value: 'white', count: 1 },
            ]
        );
    });

    it('topValues сортирует по убыванию счётчика, затем по значению', () => {
        const index = createCatalog();

        assert.deepEqual(index.topValues('brand'), [
            { value: 'apple', count: 2 },
            { value: 'samsung', count: 1 },
        ]);
        assert.deepEqual(index.topValues('brand', {}, 1), [
            { value: 'apple', count: 2 },
        ]);

        const tied = new FacetIndex()
            .addDocument(1, { color: 'white' })
            .addDocument(2, { color: 'black' });

        assert.deepEqual(tied.topValues('color'), [
            { value: 'black', count: 1 },
            { value: 'white', count: 1 },
        ]);
    });

    it('мультизначные фасеты', () => {
        const index = new FacetIndex()
            .addDocument(1, { tags: ['js', 'web'] })
            .addDocument(2, { tags: ['js'] })
            .addDocument(3, { tags: ['db'] });

        assert.deepEqual(index.search({ tags: 'js' }), [1, 2]);
        assert.deepEqual(index.search({ tags: ['db', 'web'] }), [1, 3]);
        assert.deepEqual(index.counts('tags'), [
            { value: 'db', count: 1 },
            { value: 'js', count: 2 },
            { value: 'web', count: 1 },
        ]);
    });

    it('повтор значения в документе не дублирует постинг', () => {
        const index = new FacetIndex().addDocument(1, { tags: ['js', 'js'] });

        assert.deepEqual(index.counts('tags'), [{ value: 'js', count: 1 }]);
        assert.deepEqual(index.search({ tags: 'js' }), [1]);
    });

    it('удаление документа', () => {
        const index = createCatalog();

        assert.equal(index.removeDocument(1), true);
        assert.equal(index.removeDocument(1), false);

        assert.equal(index.size(), 2);
        assert.deepEqual(index.documents(), [2, 3]);
        assert.deepEqual(index.search({ brand: 'apple' }), [3]);
        assert.deepEqual(index.counts('brand'), [
            { value: 'apple', count: 1 },
            { value: 'samsung', count: 1 },
        ]);
        assert.deepEqual(index.counts('size'), [
            { value: 6, count: 1 },
            { value: 7, count: 1 },
        ]);
    });

    it('удаление всех документов очищает фасеты', () => {
        const index = createCatalog();

        index.removeDocument(1);
        index.removeDocument(2);
        index.removeDocument(3);

        assert.equal(index.size(), 0);
        assert.deepEqual(index.documents(), []);
        assert.deepEqual(index.fields(), []);
        assert.deepEqual(index.values('brand'), []);
        assert.deepEqual(index.counts('brand'), []);
    });

    it('повторное добавление заменяет атрибуты документа', () => {
        const index = new FacetIndex()
            .addDocument(1, { brand: 'apple', color: 'black' });

        index.addDocument(1, { brand: 'samsung' });

        assert.equal(index.size(), 1);
        assert.deepEqual(index.fields(), ['brand']);
        assert.deepEqual(index.search({ brand: 'apple' }), []);
        assert.deepEqual(index.search({ color: 'black' }), []);
        assert.deepEqual(index.search({ brand: 'samsung' }), [1]);
        assert.deepEqual(index.counts('brand'), [
            { value: 'samsung', count: 1 },
        ]);
    });

    it('документ без атрибутов участвует в поиске без фильтров', () => {
        const index = new FacetIndex().addDocument(1, {});

        assert.deepEqual(index.documents(), [1]);
        assert.deepEqual(index.search({}), [1]);
        assert.deepEqual(index.search({ brand: 'apple' }), []);
        assert.deepEqual(index.fields(), []);
    });
});
