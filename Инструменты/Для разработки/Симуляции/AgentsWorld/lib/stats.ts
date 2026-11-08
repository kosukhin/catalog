/**
 * Статистика мира — то, что пользователь передаёт в `World`.
 *
 * Формат: `Map`, где ключ — модуль агента, а значение — сколько таких агентов
 * должно быть. Значение можно указать числом или объектом с настройками:
 *
 * ```js
 * new World(new Map([
 *     [echoAgent, 6],                                        // просто количество
 *     [dayAgent, { count: 1, options: { timeScale: 60 } }],  // количество + настройки
 * ]));
 * ```
 *
 * Ключом взяли сам модуль, поэтому дублировать сведения об агенте не нужно: из
 * модуля сразу известны и имя типа (`type`), и адрес кода (`moduleUrl`).
 *
 * Почему `Map`, а не обычный объект: в объекте ключ всегда приводится к строке, и
 * `{ [echoAgent]: 6 }` превратилось бы в `{ '[object Module]': 6 }`. В `Map` ключом
 * может быть сам объект модуля, поэтому запись остаётся однозначной.
 *
 * Модуль ничего не знает об агентах: он работает с любым модулем, который
 * удовлетворяет контракту `AgentPlugin`.
 */

import type { ActorAssignment } from './protocol.ts';
import { assertAgentPlugin, type AgentPlugin } from './agentPlugin.ts';

/** Количество агентов одного типа вместе с их настройками. */
export interface PopulationEntry {
    /** Сколько агентов этого типа создать. */
    readonly count: number;
    /**
     * Настройки, которые получит каждый агент этого типа (`options` в наряде).
     *
     * Значение уезжает в поток через structured clone, поэтому функции, классы и
     * `Symbol` в нём невозможны — это проверяется при сборке мира.
     */
    readonly options?: Readonly<Record<string, unknown>>;
}

/** Статистика мира: «модуль агента → количество или количество с настройками». */
export type Population = ReadonlyMap<AgentPlugin, number | PopulationEntry>;

/**
 * Разворачивает статистику в список заданий на создание акторов.
 *
 * Идентификаторы получаются предсказуемыми: `МойАгент-1`, `МойАгент-2`, …
 * Нулевое количество допускается и означает «агентов этого типа нет».
 *
 * @throws если передан не `Map`, количество не целое или отрицательное, настройки
 * не объект или не переживают `structured clone`, один тип подключён дважды,
 * либо мир пуст
 */
export function normalizePopulation(population: Population): ActorAssignment[] {
    if (!(population instanceof Map)) {
        throw new Error('статистика мира задаётся как Map «модуль агента → количество»: new World(new Map([[echoAgent, 6]]))');
    }
    const assignments: ActorAssignment[] = [];
    const seen = new Set<string>();
    for (const [plugin, entry] of population) {
        const agent = assertAgentPlugin(plugin);
        if (seen.has(agent.type)) {
            throw new Error(`тип агента «${agent.type}» подключён дважды`);
        }
        seen.add(agent.type);
        const { count, options } = readEntry(entry, agent.type);
        for (let index = 1; index <= count; index += 1) {
            assignments.push({
                id: `${agent.type}-${index}`,
                type: agent.type,
                moduleUrl: agent.moduleUrl,
                options: { ...options },
            });
        }
    }
    if (assignments.length === 0) {
        throw new Error('мир не может быть пустым: нужен хотя бы один агент');
    }
    return assignments;
}

/**
 * Сводка по составу мира: тип → сколько агентов получилось.
 *
 * Используется в логах и демо, чтобы показать, что статистика развернулась верно.
 */
export function summarizePopulation(assignments: readonly ActorAssignment[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const assignment of assignments) {
        summary[assignment.type] = (summary[assignment.type] ?? 0) + 1;
    }
    return summary;
}

/** Читает значение из состава мира: число или `{ count, options }`. */
function readEntry(entry: number | PopulationEntry, type: string): { count: number; options: Readonly<Record<string, unknown>> } {
    if (typeof entry === 'number') {
        return { count: readCount(entry, type), options: {} };
    }
    if (typeof entry !== 'object' || entry === null) {
        throw new Error(`для типа «${type}» укажите количество числом или объектом { count, options }`);
    }
    const options = entry.options ?? {};
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
        throw new Error(`options для типа «${type}» должен быть объектом`);
    }
    try {
        structuredClone(options);
    } catch {
        throw new Error(`options для типа «${type}» должны переживать structured clone: без функций, классов и Symbol`);
    }
    return { count: readCount(entry.count, type), options };
}

/** Проверяет количество агентов. */
function readCount(count: unknown, type: string): number {
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
        throw new Error(`количество агентов типа «${type}» должно быть целым неотрицательным, получено ${String(count)}`);
    }
    return count;
}
