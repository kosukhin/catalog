import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';
import { PHYSICS_POSITION } from '../physicsAgent.ts';
import { TOILET_AGENT_ID, TOILET_GRANTED, TOILET_QUEUED } from './messages.ts';
import { distanceBetween, readId, readPositionOrNull, readReplyTo, round, type ToiletStatus } from './status.ts';

export function request(status: ToiletStatus, payload: unknown, context: ActorContext): void {
    const candidate = payload as { id?: unknown; replyTo?: unknown } | undefined;
    const id = readId(candidate?.id);
    const replyTo = readReplyTo(candidate?.replyTo);
    if (replyTo === null) {
        context.log('просят туалет без обратного адреса');
        return;
    }
    if (!status.queue.includes(id)) {
        status.queue.push(id);
    }
    context.send(replyTo, createMessage(TOILET_QUEUED, { id, position: status.queue.indexOf(id) + 1 }));
    choose(status, context);
}

export function choose(status: ToiletStatus, context: ActorContext): void {
    if (status.occupant !== null || status.walking.size > 0 || status.choosing !== null) {
        return;
    }
    const candidates = status.queue.filter((id) => id !== status.justLeft);
    if (candidates.length === 0) {
        return;
    }
    status.choosing = new Set(candidates);
    status.distances.clear();
    for (const id of status.choosing) {
        context.send(status.physicsId, createMessage(PHYSICS_POSITION, { id, replyTo: TOILET_AGENT_ID }));
    }
}

export function dropFromQueue(status: ToiletStatus, id: string): void {
    const index = status.queue.indexOf(id);
    if (index >= 0) {
        status.queue.splice(index, 1);
    }
}

export function onPosition(status: ToiletStatus, payload: unknown, context: ActorContext): void {
    const report = payload as { id?: unknown; body?: unknown } | undefined;
    const id = typeof report?.id === 'string' ? report.id : null;
    if (id === null || status.choosing === null || !status.choosing.has(id)) {
        return;
    }
    status.choosing.delete(id);
    const body = report?.body as { position?: unknown } | null | undefined;
    const position = body === null || body === undefined ? null : readPositionOrNull(body.position);
    status.distances.set(id, position === null ? Number.POSITIVE_INFINITY : distanceBetween(position, status.position));
    if (status.choosing.size === 0) {
        grantNearest(status, context);
    }
}

export function grantNearest(status: ToiletStatus, context: ActorContext): void {
    status.choosing = null;
    let winner: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const [id, distance] of status.distances) {
        if (distance < best) {
            winner = id;
            best = distance;
        }
    }
    status.distances.clear();
    if (winner === null || !Number.isFinite(best)) {
        context.log('желающих не нашлось в пространстве, место пока свободно');
        return;
    }
    status.walking.add(winner);
    dropFromQueue(status, winner);
    status.justLeft = null;
    context.log(`${winner} ближе всех (${round(best)}), место его`);
    context.send(winner, createMessage(TOILET_GRANTED, { id: winner }));
}
