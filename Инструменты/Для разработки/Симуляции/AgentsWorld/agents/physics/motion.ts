import type { ActorContext } from '../../lib/actor.ts';
import { createMessage } from '../../lib/protocol/message.ts';
import { blocked, nearest } from './bodies.ts';
import { add, AROUND_ANGLES, distanceBetween, EPSILON, insideBounds, rotateOnPlane, scale, STALL_LIMIT, STALL_STEP, subtract } from './geometry.ts';
import { PHYSICS_ARRIVED } from './messages.ts';
import type { ArrivalReport, Move, PhysicsStatus, Point } from './types.ts';

export function advance(status: PhysicsStatus, context: ActorContext): void {
    for (const [id, move] of status.moves) {
        step(status, id, move, context);
    }
}

function step(status: PhysicsStatus, id: string, move: Move, context: ActorContext): void {
    const from = status.bodies.get(id);
    const goal = goalOf(status, move);
    if (from === undefined || goal === null) {
        status.moves.delete(id);
        return;
    }
    const threshold = move.kind === 'segment' ? 0 : status.arriveDistance;
    const distance = distanceBetween(from, goal);
    if (distance <= threshold + EPSILON) {
        finish(status, id, move, move.kind === 'segment' ? goal : from, null, context);
        return;
    }
    const travel = Math.min(status.speed * status.stepSeconds, distance - threshold);
    const ignore = move.targetId === null ? [id] : [id, move.targetId];
    const direction = scale(subtract(goal, from), 1 / distance);
    const next = add(from, scale(direction, travel));
    if (blocked(status, from, next, ignore) === null) {
        status.bodies.set(id, next);
        checkArrival(status, id, move, goal, threshold, next, context);
        return;
    }
    const around = aroundOf(status, from, goal, travel, ignore, move.detour);
    if (around === null) {
        finish(status, id, move, from, 'путь занят: обойти некуда', context);
        return;
    }
    move.detour = around;
    status.bodies.set(id, around);
    checkArrival(status, id, move, goal, threshold, around, context);
}

function checkArrival(status: PhysicsStatus, id: string, move: Move, goal: Point, threshold: number, position: Point, context: ActorContext): void {
    const left = distanceBetween(position, goal);
    if (left <= threshold + EPSILON) {
        finish(status, id, move, position, null, context);
        return;
    }
    const now = status.bodies.get(id);
    const ignore = move.targetId === null ? [id] : [id, move.targetId];
    if (now !== undefined && blocked(status, now, goal, ignore) === null) {
        move.detour = null;
    }
    if (left < move.best - STALL_STEP) {
        move.best = left;
        move.stalled = 0;
        return;
    }
    move.stalled += 1;
    if (move.stalled > STALL_LIMIT) {
        const reason = threshold > 0 ? 'место у цели занято' : 'путь занят: обойти некуда';
        finish(status, id, move, now ?? position, reason, context);
    }
}

export function aroundOf(status: PhysicsStatus, from: Point, goal: Point, travel: number, ignore: readonly string[], previous: Point | null): Point | null {
    const candidates: Array<{ point: Point; cost: number }> = [];
    const heading = planeHeading(from, goal);
    for (const angle of AROUND_ANGLES) {
        const direction = rotateOnPlane(heading, angle);
        const point = add(from, scale(direction, travel));
        if (!insideBounds(point, status.bounds) || nearest(status, point, ignore) !== null) {
            continue;
        }
        const turning = previous === null ? 0 : distanceBetween(previous, point);
        candidates.push({ point, cost: distanceBetween(point, goal) + turning });
    }
    if (candidates.length === 0) {
        return null;
    }
    candidates.sort((left, right) => left.cost - right.cost);
    return candidates[0]?.point ?? null;
}

function planeHeading(from: Point, to: Point): Point {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    if (length < EPSILON) {
        return { x: 1, y: 0, z: 0 };
    }
    return { x: dx / length, y: 0, z: dz / length };
}

export function goalOf(status: PhysicsStatus, move: Move): Point | null {
    if (move.kind === 'segment') {
        return move.goal;
    }
    return move.targetId === null ? null : status.bodies.get(move.targetId) ?? status.objects.get(move.targetId) ?? null;
}

export function finish(status: PhysicsStatus, id: string, move: Move, position: Point, reason: string | null, context: ActorContext): void {
    status.bodies.set(id, position);
    status.moves.delete(id);
    if (move.requester === null) {
        context.log(`тело «${id}» ${reason === null ? 'на месте' : `остановлено: ${reason}`}`);
        return;
    }
    const report: ArrivalReport = { id, position, reason };
    context.send(move.requester, createMessage(PHYSICS_ARRIVED, report));
}
