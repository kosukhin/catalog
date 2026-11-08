import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePopulation, summarizePopulation, type PopulationEntry } from '../lib/stats.ts';
import type { AgentPlugin } from '../lib/agentPlugin.ts';

/** Заглушка модуля агента: контракт соблюдён, настоящий агент не нужен. */
function createPlugin(type: string): AgentPlugin {
    return {
        type,
        moduleUrl: `file:///${type}.ts`,
        createAgent: () => ({ type, receive: () => {} }),
    };
}

describe('stats', () => {
    it('разворачивает Map «модуль → количество» в задания с id, типом и адресом', () => {
        const echo = createPlugin('EchoAgent');
        const other = createPlugin('Другой');

        const assignments = normalizePopulation(new Map([[echo, 3], [other, 1]]));

        assert.deepEqual(
            assignments.map((assignment) => assignment.id),
            ['EchoAgent-1', 'EchoAgent-2', 'EchoAgent-3', 'Другой-1'],
        );
        assert.deepEqual(assignments[0], {
            id: 'EchoAgent-1',
            type: 'EchoAgent',
            moduleUrl: 'file:///EchoAgent.ts',
            options: {},
        });
    });

    it('берёт адрес модуля из ключа, а не из отдельного объекта', () => {
        const plugin = createPlugin('Агент');
        const [assignment] = normalizePopulation(new Map([[plugin, 1]]));

        assert.equal(assignment?.moduleUrl, plugin.moduleUrl);
        assert.equal(assignment?.type, plugin.type);
    });

    it('нулевое количество даёт ноль заданий этого типа', () => {
        const echo = createPlugin('EchoAgent');
        const other = createPlugin('Другой');

        const assignments = normalizePopulation(new Map([[echo, 0], [other, 2]]));

        assert.equal(assignments.length, 2);
        assert.deepEqual(summarizePopulation(assignments), { Другой: 2 });
    });

    it('пустой мир — ошибка', () => {
        assert.throws(() => normalizePopulation(new Map()), /мир не может быть пустым/);
        assert.throws(() => normalizePopulation(new Map([[createPlugin('Один'), 0]])), /мир не может быть пустым/);
    });

    it('требует Map: обычный объект не подходит', () => {
        // @ts-expect-error: проверяем, что подсказка в ошибке понятная
        assert.throws(() => normalizePopulation({ EchoAgent: 1 }), /статистика мира задаётся как Map/);
    });

    it('отвергает некорректные количества', () => {
        assert.throws(() => normalizePopulation(new Map([[createPlugin('A'), -1]])), /целым неотрицательным/);
        assert.throws(() => normalizePopulation(new Map([[createPlugin('A'), 1.5]])), /целым неотрицательным/);
        assert.throws(() => normalizePopulation(new Map([[createPlugin('A'), Number.NaN]])), /целым неотрицательным/);
    });

    it('не даёт подключить один тип дважды', () => {
        const first = createPlugin('EchoAgent');
        const second = createPlugin('EchoAgent');

        assert.throws(() => normalizePopulation(new Map([[first, 1], [second, 1]])), /«EchoAgent» подключён дважды/);
    });

    it('проверяет форму модуля агента', () => {
        const broken = { type: 'Битый' } as AgentPlugin;

        assert.throws(() => normalizePopulation(new Map([[broken, 1]])), /нет строкового экспорта moduleUrl/);
    });

    it('принимает количество с настройками и передаёт их каждому агенту', () => {
        const clock = createPlugin('DayAgent');

        const assignments = normalizePopulation(new Map([[clock, { count: 2, options: { timeScale: 60 } }]]));

        assert.equal(assignments.length, 2);
        assert.deepEqual(assignments[0]?.options, { timeScale: 60 });
        assert.deepEqual(assignments[1]?.options, { timeScale: 60 });
        assert.notEqual(assignments[0]?.options, assignments[1]?.options, 'у каждого агента свой объект настроек');
    });

    it('число и объект с настройками можно смешивать', () => {
        const plain = createPlugin('EchoAgent');
        const configured = createPlugin('DayAgent');

        const assignments = normalizePopulation(
            new Map<AgentPlugin, number | PopulationEntry>([
                [plain, 1],
                [configured, { count: 1, options: { timeScale: 5 } }],
            ]),
        );

        assert.deepEqual(
            assignments.map((assignment) => assignment.options),
            [{}, { timeScale: 5 }],
        );
    });

    it('проверяет настройки в составе мира', () => {
        const plugin = createPlugin('DayAgent');

        assert.throws(
            () => normalizePopulation(new Map([[plugin, { count: 1, options: [] } as unknown as PopulationEntry]])),
            /options для типа «DayAgent» должен быть объектом/,
        );
        assert.throws(
            () => normalizePopulation(new Map([[plugin, { count: 'два' } as unknown as PopulationEntry]])),
            /целым неотрицательным/,
        );
        assert.throws(
            () => normalizePopulation(new Map([[plugin, { count: 1, options: { now: () => new Date() } } as unknown as PopulationEntry]])),
            /переживать structured clone/,
        );
    });

    it('summarizePopulation считает агентов по типам', () => {
        const assignments = normalizePopulation(new Map([[createPlugin('EchoAgent'), 2], [createPlugin('Другой'), 3]]));

        assert.deepEqual(summarizePopulation(assignments), { EchoAgent: 2, Другой: 3 });
    });
});
