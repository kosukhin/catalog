import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';
import * as day from '../dayAgent.ts';
import type { HumanStatus } from './status.ts';
import { decide } from './economy.ts';

export function askTime(context: ActorContext): void {
    context.send(day.DAY_AGENT_ID, createMessage(day.TIME_REQUEST, { replyTo: context.id }));
}

export function applyTime(status: HumanStatus, payload: unknown, context: ActorContext): void {
    const report = payload as { phase?: unknown } | undefined;
    const previous = status.state;
    status.phase = report?.phase === 'день' ? 'день' : 'ночь';
    decide(status, context);
    if (previous !== status.state) {
        context.log(`сейчас ${status.phase}, моё состояние: ${status.state}`);
    }
}
