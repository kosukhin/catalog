import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';

export interface ChargeRequest {
    readonly owner: string;
    readonly amount: number;
    readonly replyTo: string | null;
}

export interface PaymentReport {
    readonly owner: string;
    readonly amount: number;
    readonly accepted: boolean;
    readonly balance: number;
    readonly reason: string | null;
}

export function send(replyTo: string | null, messageType: string, payload: unknown, context: ActorContext): void {
    if (replyTo === null) {
        return;
    }
    context.send(replyTo, createMessage(messageType, payload));
}

export function pay(request: ChargeRequest, accepted: boolean, balance: number, reason: string | null, reportType: string, context: ActorContext): void {
    const report: PaymentReport = { owner: request.owner, amount: request.amount, accepted, balance, reason };
    send(request.replyTo, reportType, report, context);
}
