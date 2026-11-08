import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePopulation, summarizePopulation } from '../lib/stats.ts';

describe('stats', () => {
    it('разворачивает статистику в наряды с предсказуемыми id', () => {
        const assignments = normalizePopulation({ EchoAgent: 3, Другой: 1 });

        assert.deepEqual(
            assignments.map((assignment) => assignment.id),
            ['EchoAgent-1', 'EchoAgent-2', 'EchoAgent-3', 'Другой-1'],
        );
        assert.deepEqual(assignments[0], { id: 'EchoAgent-1', type: 'EchoAgent', options: {} });
    });

    it('нулевое количество даёт ноль нарядов этого типа', () => {
        const assignments = normalizePopulation({ EchoAgent: 0, Другой: 2 });

        assert.equal(assignments.length, 2);
        assert.deepEqual(summarizePopulation(assignments), { Другой: 2 });
    });

    it('пустой мир — ошибка', () => {
        assert.throws(() => normalizePopulation({}), /мир не может быть пустым/);
        assert.throws(() => normalizePopulation({ EchoAgent: 0 }), /мир не может быть пустым/);
    });

    it('отвергает некорректные количества', () => {
        assert.throws(() => normalizePopulation({ EchoAgent: -1 }), /целым неотрицательным/);
        assert.throws(() => normalizePopulation({ EchoAgent: 1.5 }), /целым неотрицательным/);
        assert.throws(() => normalizePopulation({ EchoAgent: Number.NaN }), /целым неотрицательным/);
    });

    it('отвергает пустой тип агента', () => {
        assert.throws(() => normalizePopulation({ '  ': 1 }), /тип агента не может быть пустым/);
    });

    it('summarizePopulation считает агентов по типам', () => {
        const assignments = normalizePopulation({ EchoAgent: 2, Другой: 3 });

        assert.deepEqual(summarizePopulation(assignments), { EchoAgent: 2, Другой: 3 });
    });
});
