import type { ActorFactory } from './actor.ts';

export interface AgentPlugin {
    readonly type: string;
    readonly moduleUrl: string;
    readonly createAgent: ActorFactory;
}

export function assertAgentPlugin(value: unknown): AgentPlugin {
    if (typeof value !== 'object' || value === null) {
        throw new Error('модуль агента должен быть объектом с полями type, moduleUrl, createAgent');
    }
    const candidate = value as { type?: unknown; moduleUrl?: unknown; createAgent?: unknown };
    if (typeof candidate.type !== 'string' || candidate.type.trim() === '') {
        throw new Error('в модуле агента нет строкового экспорта type');
    }
    if (typeof candidate.moduleUrl !== 'string' || candidate.moduleUrl.trim() === '') {
        throw new Error(`в модуле агента «${candidate.type}» нет строкового экспорта moduleUrl`);
    }
    if (typeof candidate.createAgent !== 'function') {
        throw new Error(`в модуле агента «${candidate.type}» нет функции createAgent`);
    }
    return candidate as unknown as AgentPlugin;
}
