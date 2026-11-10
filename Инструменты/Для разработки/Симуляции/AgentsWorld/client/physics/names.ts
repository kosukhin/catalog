import { defaultFetcher, type PhysicsFetcher } from './fetcher.ts';

export interface AgentNames {
    readonly [id: string]: string;
}

export async function loadAgentNames(url: string, fetcher: PhysicsFetcher = defaultFetcher): Promise<AgentNames> {
    const response = await fetcher(url);
    return toNames(await response.json());
}

export function toNames(payload: unknown): AgentNames {
    const items = (payload as { items?: unknown } | undefined)?.items;
    if (!Array.isArray(items)) {
        return {};
    }
    const names: Record<string, string> = {};
    for (const item of items) {
        const entry = item as { id?: unknown; details?: { name?: unknown } } | undefined;
        const name = entry?.details?.name;
        if (typeof entry?.id === 'string' && typeof name === 'string' && name.trim() !== '') {
            names[entry.id] = name;
        }
    }
    return names;
}
