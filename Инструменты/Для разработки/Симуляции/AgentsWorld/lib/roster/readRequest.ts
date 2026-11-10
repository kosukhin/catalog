import type { RosterEntry } from './entries.ts';

export interface RosterRequest {
    readonly types: string[];
    readonly replyTo: string | null;
}

export function readRequest(payload: unknown): RosterRequest {
    const candidate = payload as { types?: unknown; replyTo?: unknown } | undefined;
    return { types: readTypes(candidate?.types), replyTo: readReplyTo(candidate?.replyTo) };
}

function readTypes(value: unknown): string[] {
    if (value === undefined) {
        return [];
    }
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
    return types;
}

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function readEntries(payload: unknown): RosterEntry[] {
    const candidate = payload as { agents?: unknown } | undefined;
    if (!Array.isArray(candidate?.agents)) {
        throw new Error('в снимке реестра нет массива agents');
    }
    const entries: RosterEntry[] = [];
    for (const item of candidate.agents) {
        const entry = item as { id?: unknown; type?: unknown } | undefined;
        if (typeof entry?.id !== 'string' || entry.id.trim() === '') {
            throw new Error('в снимке реестра у агента нет адреса (id)');
        }
        if (typeof entry.type !== 'string' || entry.type.trim() === '') {
            throw new Error(`в снимке реестра у агента «${entry.id}» нет типа (type)`);
        }
        entries.push({ id: entry.id, type: entry.type });
    }
    return entries;
}
