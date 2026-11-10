import type { PhysicsState } from '../agents/physicsAgent.ts';

export type PhysicsFetcher = (url: string) => Promise<{ readonly json: () => Promise<unknown> }>;

export async function loadPhysicsState(url: string, fetcher: PhysicsFetcher = defaultFetcher): Promise<PhysicsState> {
    const response = await fetcher(url);
    return (await response.json()) as PhysicsState;
}

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

async function defaultFetcher(url: string): Promise<{ readonly json: () => Promise<unknown> }> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response;
}
