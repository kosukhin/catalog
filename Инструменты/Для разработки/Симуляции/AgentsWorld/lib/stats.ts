/**
 * Статистика мира — то, что пользователь передаёт в `World`.
 *
 * Формат: `Map`, где ключ — модуль агента, а значение — сколько таких агентов
 * должно быть:
 *
 * ```js
 * import * as echoAgent from '../agents/echoAgent.ts';
 *
 * new World(new Map([[echoAgent, 6]]));
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

/** Статистика мира: «модуль агента → сколько агентов этого типа нужно». */
export type Population = ReadonlyMap<AgentPlugin, number>;

/**
 * Разворачивает статистику в список заданий на создание акторов.
 *
 * Идентификаторы получаются предсказуемыми: `МойАгент-1`, `МойАгент-2`, …
 * Нулевое количество допускается и означает «агентов этого типа нет».
 *
 * @throws если передан не `Map`, количество не целое или отрицательное, один тип
 * подключён дважды, либо мир пуст
 */
export function normalizePopulation(population: Population): ActorAssignment[] {
    if (!(population instanceof Map)) {
        throw new Error('статистика мира задаётся как Map «модуль агента → количество»: new World(new Map([[echoAgent, 6]]))');
    }
    const assignments: ActorAssignment[] = [];
    const seen = new Set<string>();
    for (const [plugin, count] of population) {
        const agent = assertAgentPlugin(plugin);
        if (seen.has(agent.type)) {
            throw new Error(`тип агента «${agent.type}» подключён дважды`);
        }
        seen.add(agent.type);
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new Error(`количество агентов типа «${agent.type}» должно быть целым неотрицательным, получено ${String(count)}`);
        }
        for (let index = 1; index <= count; index += 1) {
            assignments.push({
                id: `${agent.type}-${index}`,
                type: agent.type,
                moduleUrl: agent.moduleUrl,
                options: {},
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
