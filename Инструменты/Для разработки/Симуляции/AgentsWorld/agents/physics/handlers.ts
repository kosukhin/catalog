import type { ActorContext } from '../../lib/actor.ts';
import { createMessage } from '../../lib/protocol/message.ts';
import { blocked, freeSpot } from './bodies.ts';
import { add, distanceBetween, formatPoint, insideBounds, scale } from './geometry.ts';
import { PHYSICS_ARRIVED, PHYSICS_BODY, PHYSICS_REPORT, PHYSICS_STATE } from './messages.ts';
import { readMoveRequest, readMoveToRequest, readPlaceRequest, readPositionRequest, readRegister, readReplyTo } from './requests.ts';
import type { ArrivalReport, Move, MoveReport, PhysicsBody, PhysicsState, PhysicsStatus, Point } from './types.ts';

const ZERO: Point = { x: 0, y: 0, z: 0 };

export function register(status: PhysicsStatus, payload: unknown, context: ActorContext): void {
    const request = readRegister(payload);
    const position = request.position ?? freeSpot(status);
    if (position === null) {
        context.log(`для «${request.id}» не нашлось места в границах мира`);
        return;
    }
    if (!insideBounds(position, status.bounds)) {
        context.log(`точка ${formatPoint(position)} вне границ мира, тело «${request.id}» не заведено`);
        return;
    }
    status.bodies.set(request.id, position);
    context.log(`тело «${request.id}» в точке ${formatPoint(position)}`);
}

export function place(status: PhysicsStatus, payload: unknown, context: ActorContext): void {
    const request = readPlaceRequest(payload);
    if (!insideBounds(request.position, status.bounds)) {
        context.log(`точка ${formatPoint(request.position)} вне границ мира, объект «${request.id}» не поставлен`);
        return;
    }
    status.objects.set(request.id, request.position);
    context.log(`объект «${request.id}» в точке ${formatPoint(request.position)}`);
}

export function requestMove(status: PhysicsStatus, payload: unknown, context: ActorContext): void {
    const request = readMoveRequest(payload);
    const from = status.bodies.get(request.id);
    if (from === undefined) {
        reply(context, request.replyTo, request.id, false, `тело «${request.id}» не зарегистрировано`, ZERO);
        return;
    }
    const length = Math.hypot(request.direction.x, request.direction.y, request.direction.z);
    if (length === 0) {
        reply(context, request.replyTo, request.id, false, 'нулевое направление', from);
        return;
    }
    const goal = add(from, scale(request.direction, request.distance / length));
    const reason = blocked(status, from, goal, [request.id]);
    if (reason !== null) {
        reply(context, request.replyTo, request.id, false, reason, from);
        return;
    }
    status.moves.set(request.id, moveOf('segment', goal, null, request.replyTo));
    reply(context, request.replyTo, request.id, true, null, from);
}

export function requestMoveTo(status: PhysicsStatus, payload: unknown, context: ActorContext): void {
    const request = readMoveToRequest(payload);
    const from = status.bodies.get(request.id);
    if (from === undefined) {
        reply(context, request.replyTo, request.id, false, `тело «${request.id}» не зарегистрировано`, ZERO);
        return;
    }
    const target = status.bodies.get(request.targetId) ?? status.objects.get(request.targetId);
    if (target === undefined) {
        reply(context, request.replyTo, request.id, false, `тело-цель «${request.targetId}» не зарегистрировано`, from);
        return;
    }
    status.moves.set(request.id, moveOf('pursue', null, request.targetId, request.replyTo));
    reply(context, request.replyTo, request.id, true, null, from);
}

export function reportPosition(status: PhysicsStatus, payload: unknown, context: ActorContext): void {
    const request = readPositionRequest(payload);
    const position = status.bodies.get(request.id) ?? status.objects.get(request.id) ?? null;
    const body: PhysicsBody | null = position === null ? null : { id: request.id, position };
    if (request.replyTo === null) {
        context.log(`спросили позицию «${request.id}» без обратного адреса`);
        return;
    }
    context.send(request.replyTo, createMessage(PHYSICS_BODY, { id: request.id, body }));
}

export function reportState(status: PhysicsStatus, payload: unknown, context: ActorContext): void {
    const replyTo = readReplyTo((payload as { replyTo?: unknown } | undefined)?.replyTo);
    const state: PhysicsState = {
        speed: status.speed,
        stepSeconds: status.stepSeconds,
        minDistance: status.minDistance,
        arriveDistance: status.arriveDistance,
        bounds: status.bounds,
        bodies: [...status.bodies.entries()].map(([id, position]) => ({ id, position })),
        objects: [...status.objects.entries()].map(([id, position]) => ({ id, position })),
        moving: [...status.moves.keys()],
    };
    if (replyTo === null) {
        context.log('спросили состояние физики без обратного адреса');
        return;
    }
    context.send(replyTo, createMessage(PHYSICS_STATE, state));
}

function moveOf(kind: 'segment' | 'pursue', goal: Point | null, targetId: string | null, requester: string | null): Move {
    return { kind, goal, targetId, requester, detour: null, best: Number.POSITIVE_INFINITY, stalled: 0 };
}

function reply(context: ActorContext, replyTo: string | null, id: string, accepted: boolean, reason: string | null, position: Point): void {
    if (replyTo === null) {
        context.log(`«${id}»: ${accepted ? 'принято' : `отказано (${reason ?? ''})`}`);
        return;
    }
    const report: MoveReport = { id, accepted, reason, position };
    context.send(replyTo, createMessage(PHYSICS_REPORT, report));
}

export const ARRIVED = PHYSICS_ARRIVED;
