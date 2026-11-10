import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';
import { TIME_REQUEST } from '../dayAgent.ts';
import { TOILET_AGENT_ID, TOILET_RELEASED } from './messages.ts';
import { choose, dropFromQueue } from './queue.ts';
import { readId, type ToiletStatus } from './status.ts';

export function enter(status: ToiletStatus, payload: unknown, context: ActorContext): void {
    const id = readId((payload as { id?: unknown } | undefined)?.id);
    if (status.occupant !== null) {
        context.log(`${id} не поместился: туалет занят`);
        return;
    }
    status.walking.delete(id);
    dropFromQueue(status, id);
    status.occupant = id;
    status.enteredAt = null;
    askTime(status, context);
}

export function leave(status: ToiletStatus, payload: unknown, context: ActorContext): void {
    const id = readId((payload as { id?: unknown } | undefined)?.id);
    if (status.occupant === id) {
        release(status, context);
        return;
    }
    status.walking.delete(id);
    dropFromQueue(status, id);
    context.log(`${id} передумал`);
}

export function askTime(status: ToiletStatus, context: ActorContext): void {
    context.send(status.dayId, createMessage(TIME_REQUEST, { replyTo: TOILET_AGENT_ID }));
}

export function onTime(status: ToiletStatus, payload: unknown, context: ActorContext): void {
    if (status.occupant === null) {
        return;
    }
    const report = payload as { iso?: unknown } | undefined;
    const now = typeof report?.iso === 'string' ? Date.parse(report.iso) : Number.NaN;
    if (!Number.isFinite(now)) {
        return;
    }
    if (status.enteredAt === null) {
        status.enteredAt = now;
        return;
    }
    if ((now - status.enteredAt) / 60_000 >= status.minutes) {
        context.log(`${status.occupant} провёл ${status.minutes} игровых минут`);
        release(status, context);
    }
}

export function release(status: ToiletStatus, context: ActorContext): void {
    const who = status.occupant;
    if (who === null) {
        return;
    }
    status.occupant = null;
    status.enteredAt = null;
    status.justLeft = who;
    context.send(who, createMessage(TOILET_RELEASED, { id: who }));
    context.log(`${who} освободил место`);
    choose(status, context);
}
