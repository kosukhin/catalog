import { availableParallelism } from 'node:os';

export function poolSize(size: number | undefined, maxWorkers: number | undefined): number {
    const requested = size ?? availableParallelism();
    const limit = maxWorkers ?? Number.POSITIVE_INFINITY;
    return Math.max(1, Math.min(Math.trunc(requested), limit));
}
