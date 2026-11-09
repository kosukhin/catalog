import { createMessage, STATUS_REQUEST, STATUS_REPORT, type ActorId, type Message, type StatusReport } from './protocol.ts';

export interface ActorContext {
    readonly id: ActorId;
    send(to: ActorId, message: Message): void;
    log(text: string): void;
}

export interface Actor {
    readonly type: string;
    start?(context: ActorContext): void | Promise<void>;
    receive(message: Message, context: ActorContext): void | Promise<void>;
    stop?(context: ActorContext): void | Promise<void>;
}

export type ActorFactory = (id: ActorId, options: Readonly<Record<string, unknown>>) => Actor;

export abstract class AbstractActor implements Actor {
    abstract readonly type: string;

    receive(message: Message, context: ActorContext): void | Promise<void> {
        if (message.type === STATUS_REQUEST) {
            const replyTo = readReplyTo(message.payload);
            if (replyTo !== null) {
                const report: StatusReport = { id: context.id, type: this.type, details: this.describe() };
                context.send(replyTo, createMessage(STATUS_REPORT, report));
            }
            return;
        }
        return this.handle(message, context);
    }

    protected abstract handle(message: Message, context: ActorContext): void | Promise<void>;

    protected describe(): Readonly<Record<string, unknown>> {
        return {};
    }
}

function readReplyTo(payload: unknown): string | null {
    const replyTo = (payload as { replyTo?: unknown } | undefined)?.replyTo;
    return typeof replyTo === 'string' && replyTo.trim() !== '' ? replyTo : null;
}
