import type { ActorAssignment } from './protocol/worker.ts';
import { assertAgentPlugin, type AgentPlugin } from './agentPlugin.ts';

export interface PopulationEntry {
    readonly count: number;
    readonly options?: Readonly<Record<string, unknown>>;
}

export type Population = ReadonlyMap<AgentPlugin, number | PopulationEntry>;

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

export function summarizePopulation(assignments: readonly ActorAssignment[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const assignment of assignments) {
        summary[assignment.type] = (summary[assignment.type] ?? 0) + 1;
    }
    return summary;
}

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

function readCount(count: unknown, type: string): number {
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
        throw new Error(`количество агентов типа «${type}» должно быть целым неотрицательным, получено ${String(count)}`);
    }
    return count;
}
