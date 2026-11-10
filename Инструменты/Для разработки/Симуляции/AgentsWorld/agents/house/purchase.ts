import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';
import { BANK_AGENT_ID, BANK_CHARGE } from '../bankAgent.ts';
import { HOUSE_AGENT_ID, HOUSE_REPORT } from './messages.ts';
import { readOwner, readReplyTo, type HouseRecord, type HouseStatus } from './status.ts';

export function buy(status: HouseStatus, payload: unknown, context: ActorContext): void {
    const candidate = payload as { owner?: unknown; bankId?: unknown; replyTo?: unknown } | undefined;
    const owner = readOwner(candidate?.owner);
    const replyTo = readReplyTo(candidate?.replyTo);
    if (replyTo === null) {
        context.log('покупатель без обратного адреса');
        return;
    }
    const existing = status.houses.get(owner);
    if (existing !== undefined) {
        report(replyTo, existing, true, 'дом уже куплен', context);
        return;
    }
    const bankId = typeof candidate?.bankId === 'string' && candidate.bankId.trim() !== '' ? candidate.bankId : status.bankId;
    status.pending.set(owner, { owner, replyTo });
    context.send(bankId, createMessage(BANK_CHARGE, { owner, amount: status.price, replyTo: HOUSE_AGENT_ID }));
}

export function report(replyTo: string, house: HouseRecord | null, accepted: boolean, reason: string | null, context: ActorContext): void {
    const payload = { owner: house?.owner ?? null, houseId: house?.id ?? null, position: house?.position ?? null, accepted, reason };
    context.send(replyTo, createMessage(HOUSE_REPORT, payload));
}

export const DEFAULT_BANK = BANK_AGENT_ID;
