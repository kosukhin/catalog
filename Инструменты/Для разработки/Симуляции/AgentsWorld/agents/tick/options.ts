import { ROSTER_AGENT_ID } from '../../lib/rosterAgent.ts';
interface AgentRef {
    readonly id: string;
    readonly type: string;
}

const DEFAULT_INTERVAL_MS = 1000;

export function readInterval(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_INTERVAL_MS;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error('intervalMs должен быть целым положительным числом миллисекунд');
    }
    return value;
}

export function readTypes(value: unknown): string[] {
    if (!Array.isArray(value)) {
        throw new Error('types должен быть массивом типов агентов');
    }
    const types: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string' || item.trim() === '') {
            throw new Error('каждый тип в types должен быть непустой строкой');
        }
        types.push(item);
    }
    if (types.length === 0) {
        throw new Error('types должен содержать хотя бы один тип агента');
    }
    return types;
}

export function readRosterId(value: unknown): string {
    if (value === undefined) {
        return ROSTER_AGENT_ID;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('rosterId должен быть непустой строкой');
    }
    return value;
}

export function readIds(payload: unknown): string[] {
    const candidate = payload as { ids?: unknown } | undefined;
    if (!Array.isArray(candidate?.ids)) {
        throw new Error('в ответе реестра нет массива ids');
    }
    const ids: string[] = [];
    for (const item of candidate.ids) {
        if (typeof item !== 'string' || item.trim() === '') {
            throw new Error('каждый id в ответе реестра должен быть непустой строкой');
        }
        ids.push(item);
    }
    return ids;
}

export function readAgents(payload: unknown): AgentRef[] {
    const candidate = payload as { agents?: unknown } | undefined;
    if (!Array.isArray(candidate?.agents)) {
        throw new Error('в уведомлении реестра нет массива agents');
    }
    const agents: AgentRef[] = [];
    for (const item of candidate.agents) {
        const agent = item as { id?: unknown; type?: unknown } | undefined;
        if (typeof agent?.id !== 'string' || agent.id.trim() === '') {
            throw new Error('в уведомлении реестра у агента нет адреса (id)');
        }
        if (typeof agent.type !== 'string' || agent.type.trim() === '') {
            throw new Error(`в уведомлении реестра у агента «${agent.id}» нет типа (type)`);
        }
        agents.push({ id: agent.id, type: agent.type });
    }
    return agents;
}
