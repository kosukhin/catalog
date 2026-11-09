import type { PhysicsState } from '../agents/physicsAgent.ts';

export type PhysicsFetcher = (url: string) => Promise<{ readonly json: () => Promise<unknown> }>;

export async function loadPhysicsState(url: string, fetcher: PhysicsFetcher = defaultFetcher): Promise<PhysicsState> {
    const response = await fetcher(url);
    return (await response.json()) as PhysicsState;
}

async function defaultFetcher(url: string): Promise<{ readonly json: () => Promise<unknown> }> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response;
}
