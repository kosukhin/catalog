import type { ActorId } from '../protocol/message.ts';
import type { ActorAssignment } from '../protocol/worker.ts';

export function assignRoutes(
    assignments: readonly ActorAssignment[],
    workerCount: number,
): { readonly routes: Map<ActorId, number>; readonly perThread: ActorAssignment[][] } {
    const routes = new Map<ActorId, number>();
    const perThread: ActorAssignment[][] = Array.from({ length: workerCount }, () => []);
    assignments.forEach((assignment, index) => {
        const threadIndex = index % workerCount;
        routes.set(assignment.id, threadIndex);
        perThread[threadIndex]?.push(assignment);
    });
    return { routes, perThread };
}
