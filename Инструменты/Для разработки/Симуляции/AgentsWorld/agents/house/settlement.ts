import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';
import { PHYSICS_PLACE, PHYSICS_POSITION } from '../physicsAgent.ts';
import { HOUSE_AGENT_ID } from './messages.ts';
import { report } from './purchase.ts';
import { readOwner, type HouseRecord, type HouseStatus } from './status.ts';

export function onPayment(status: HouseStatus, payload: unknown, context: ActorContext): void {
    const candidate = payload as { owner?: unknown; accepted?: unknown; reason?: unknown } | undefined;
    const owner = readOwner(candidate?.owner);
    const pending = status.pending.get(owner);
    if (pending === undefined) {
        context.log(`оплата для «${owner}», а покупки не было`);
        return;
    }
    if (candidate?.accepted !== true) {
        status.pending.delete(owner);
        const reason = typeof candidate?.reason === 'string' ? candidate.reason : 'банк отказал';
        context.log(`банк отказал «${owner}»: ${reason}`);
        report(pending.replyTo, null, false, reason, context);
        return;
    }
    context.send(status.physicsId, createMessage(PHYSICS_POSITION, { id: owner, replyTo: HOUSE_AGENT_ID }));
}

export function onPosition(status: HouseStatus, payload: unknown, context: ActorContext): void {
    const candidate = payload as { id?: unknown; body?: unknown } | undefined;
    const owner = typeof candidate?.id === 'string' ? candidate.id : '';
    const pending = status.pending.get(owner);
    if (pending === undefined) {
        return;
    }
    status.pending.delete(owner);
    const body = candidate?.body as { position?: { x: number; y: number; z: number } } | null | undefined;
    if (body === null || body === undefined || typeof body.position !== 'object' || body.position === null) {
        context.log(`у «${owner}» нет точки в пространстве`);
        report(pending.replyTo, null, false, 'нет точки в пространстве', context);
        return;
    }
    const record: HouseRecord = { id: `House-${owner}`, owner, position: body.position };
    status.houses.set(owner, record);
    context.send(status.physicsId, createMessage(PHYSICS_PLACE, { id: record.id, position: record.position }));
    context.log(`дом для «${owner}» стоит в точке (${record.position.x}; ${record.position.y}; ${record.position.z})`);
    report(pending.replyTo, record, true, null, context);
}
