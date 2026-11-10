import type { PhysicsState } from '../agents/physics/types.ts';
import type { TimeReport } from '../agents/day/types.ts';
import { defaultFetcher } from './physics/fetcher.ts';

import type { PhysicsFetcher } from './physics/fetcher.ts';
export type { PhysicsFetcher };

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
    const candidate = clock as { hours?: unknown; minutes?: unknown };
    if (typeof candidate.hours !== 'number' || typeof candidate.minutes !== 'number') {
        return null;
    }
    return clock as TimeReport;
}
