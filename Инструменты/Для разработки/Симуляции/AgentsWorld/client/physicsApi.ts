import type { PhysicsState } from '../agents/physicsAgent.ts';
import type { TimeReport } from '../agents/dayAgent.ts';

export type PhysicsFetcher = (url: string) => Promise<{ readonly json: () => Promise<unknown> }>;

export async function loadPhysicsState(url: string, fetcher: PhysicsFetcher = defaultFetcher): Promise<PhysicsState> {
    const response = await fetcher(url);
    return (await response.json()) as PhysicsState;
}

export async function loadWorldClock(url: string, fetcher: PhysicsFetcher = defaultFetcher): Promise<TimeReport | null> {
    const response = await fetcher(url);
    return toClock(await response.json());
}

export function toClock(payload: unknown): TimeReport | null {
    const clock = (payload as { clock?: unknown } | undefined)?.clock;
    if (clock === null || typeof clock !== 'object') {
        return null;
    }
    const candidate = clock as { hours?: unknown; minutes?: unknown; phase?: unknown };
    if (typeof candidate.hours !== 'number' || typeof candidate.minutes !== 'number') {
        return null;
    }
    return clock as TimeReport;
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
