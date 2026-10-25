import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoaringBitmap } from './RoaringBitmaps.js';

describe('RoaringBitmap', () => {
    it('пустая структура', () => {
        const rb = new RoaringBitmap();

        assert.equal(rb.size, 0);
        assert.equal(rb.isEmpty(), true);
        assert.deepEqual(rb.toArray(), []);
        assert.equal(rb.has(0), false);
        assert.equal(rb.has(4294967295), false);
    });

    it('добавление и проверка принадлежности', () => {
        const rb = new RoaringBitmap();
        rb.add(1).add(10).add(100);

        assert.equal(rb.has(1), true);
        assert.equal(rb.has(10), true);
        assert.equal(rb.has(100), true);
        assert.equal(rb.has(2), false);
        assert.equal(rb.contains(100), true, 'contains — псевдоним has');
        assert.equal(rb.size, 3);
    });

    it('повторное добавление не увеличивает size', () => {
        const rb = new RoaringBitmap();
        rb.add(42);
        rb.add(42);
        rb.add(42);

        assert.equal(rb.size, 1);
        assert.deepEqual(rb.toArray(), [42]);
    });

    it('toArray возвращает отсортированные уникальные значения', () => {
        const rb = new RoaringBitmap();
        rb.add(5).add(3).add(9).add(1).add(3);

        assert.deepEqual(rb.toArray(), [1, 3, 5, 9]);
    });

    it('удаление значения', () => {
        const rb = new RoaringBitmap();
        rb.add(1).add(2).add(3);

        assert.equal(rb.remove(2), true);
        assert.equal(rb.has(2), false);
        assert.equal(rb.size, 2);
        assert.equal(rb.remove(2), false, 'повторное удаление возвращает false');
        assert.equal(rb.size, 2);
    });

    it('значения в разных «чанках» по старшим 16 битам', () => {
        const rb = new RoaringBitmap();
        rb.add(0);          // high = 0
        rb.add(65536);      // high = 1
        rb.add(4294967295); // high = 65535

        assert.equal(rb.size, 3);
        assert.deepEqual(rb.toArray(), [0, 65536, 4294967295]);
    });

    it('разреженный набор хранится в array-контейнере', () => {
        const rb = new RoaringBitmap();
        for (let i = 0; i < 100; i++) {
            rb.add(i * 2); // 100 значений внутри одного чанка
        }

        const stats = rb.stats();
        assert.equal(stats.containers, 1);
        assert.equal(stats.array, 1);
        assert.equal(stats.bitmap, 0);
        assert.equal(stats.run, 0);
    });

    it('плотный набор (>4096) переключается в bitmap-контейнер', () => {
        const rb = new RoaringBitmap();
        for (let i = 0; i < 5000; i++) {
            rb.add(i);
        }

        const stats = rb.stats();
        assert.equal(stats.containers, 1);
        assert.equal(stats.bitmap, 1);
        assert.equal(stats.array, 0);
        assert.equal(rb.size, 5000);
    });

    it('обратный переход bitmap -> array при уменьшении до <=4096', () => {
        const rb = new RoaringBitmap();
        for (let i = 0; i < 5000; i++) {
            rb.add(i);
        }
        for (let i = 0; i < 1000; i++) {
            rb.remove(i);
        }

        const stats = rb.stats();
        assert.equal(stats.array, 1);
        assert.equal(stats.bitmap, 0);
        assert.equal(rb.size, 4000);
        assert.equal(rb.has(0), false);
        assert.equal(rb.has(1000), true);
    });

    it('runOptimize сжимает последовательные значения в run-контейнер', () => {
        const rb = new RoaringBitmap();
        for (let i = 0; i < 10000; i++) {
            rb.add(i);
        }
        rb.runOptimize();

        const stats = rb.stats();
        assert.equal(stats.run, 1);
        assert.equal(stats.bitmap, 0);
        assert.equal(rb.size, 10000);
        assert.equal(rb.has(9999), true);
        assert.equal(rb.has(10000), false);
    });

    it('runOptimize уменьшает занимаемую память', () => {
        const rb = new RoaringBitmap();
        for (let i = 0; i < 10000; i++) {
            rb.add(i);
        }
        const before = rb.stats().sizeInBytes;

        rb.runOptimize();

        const after = rb.stats().sizeInBytes;
        assert.ok(after < before, `ожидалось меньше памяти: ${after} < ${before}`);
    });

    it('объединение (union)', () => {
        const a = RoaringBitmap.fromArray([1, 2, 3]);
        const b = RoaringBitmap.fromArray([3, 4, 5]);

        assert.deepEqual(a.union(b).toArray(), [1, 2, 3, 4, 5]);
    });

    it('пересечение (intersection)', () => {
        const a = RoaringBitmap.fromArray([1, 2, 3, 4]);
        const b = RoaringBitmap.fromArray([3, 4, 5, 6]);

        assert.deepEqual(a.intersection(b).toArray(), [3, 4]);
    });

    it('разность (difference)', () => {
        const a = RoaringBitmap.fromArray([1, 2, 3, 4, 5]);
        const b = RoaringBitmap.fromArray([2, 4]);

        assert.deepEqual(a.difference(b).toArray(), [1, 3, 5]);
    });

    it('симметрическая разность (symmetricDifference)', () => {
        const a = RoaringBitmap.fromArray([1, 2, 3]);
        const b = RoaringBitmap.fromArray([3, 4]);

        assert.deepEqual(a.symmetricDifference(b).toArray(), [1, 2, 4]);
    });

    it('clone создаёт независимую копию', () => {
        const a = RoaringBitmap.fromArray([1, 2, 3]);
        const b = a.clone();
        b.add(4);

        assert.deepEqual(a.toArray(), [1, 2, 3]);
        assert.deepEqual(b.toArray(), [1, 2, 3, 4]);
    });

    it('clear очищает структуру', () => {
        const rb = RoaringBitmap.fromArray([1, 2, 3]);
        rb.clear();

        assert.equal(rb.size, 0);
        assert.equal(rb.isEmpty(), true);
        assert.deepEqual(rb.toArray(), []);
    });

    it('fromArray и крайние 32-битные значения', () => {
        const rb = RoaringBitmap.fromArray([0, 4294967295, 65536]);

        assert.equal(rb.has(0), true);
        assert.equal(rb.has(4294967295), true);
        assert.equal(rb.size, 3);
    });

    it('валидация входных значений', () => {
        const rb = new RoaringBitmap();

        assert.throws(() => rb.add(-1));
        assert.throws(() => rb.add(1.5));
        assert.throws(() => rb.add(4294967296));
        assert.throws(() => rb.add('42'));
        assert.throws(() => rb.has(null));
    });
});
