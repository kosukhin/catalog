import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol/message.ts';
import { TICK } from '../lib/protocol/names.ts';
import { ROSTER_QUERY, ROSTER_REPORT, ROSTER_SUBSCRIBE, ROSTER_UPDATE } from '../lib/rosterAgent.ts';
import { readAgents, readIds, readInterval, readRosterId, readTypes } from './tick/options.ts';

const AGENT_TYPE = 'TickAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const TICK_AGENT_ID = 'TickAgent-1';

interface TickStatus {
    readonly intervalMs: number;
    readonly types: readonly string[];
    readonly rosterId: string;
    timer: ReturnType<typeof setInterval> | null;
    recipients: string[];
}

export class TickAgent extends AbstractActor {
    readonly #status: TickStatus;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super(AGENT_TYPE);
        this.#status = {
            intervalMs: readInterval(options.intervalMs),
            types: readTypes(options.types),
            rosterId: readRosterId(options.rosterId),
            timer: null,
            recipients: [],
        };
    }

    state(): { readonly intervalMs: number; readonly types: readonly string[]; readonly recipients: number } {
        return { intervalMs: this.#status.intervalMs, types: this.#status.types, recipients: this.#status.recipients.length };
    }

    start(context: ActorContext): void {
        const status = this.#status;
        context.log(`бужу «${status.types.join(', ')}» каждые ${status.intervalMs} мс через реестр ${status.rosterId}`);
        context.send(status.rosterId, createMessage(ROSTER_QUERY, { types: [...status.types], replyTo: context.id }));
        context.send(status.rosterId, createMessage(ROSTER_SUBSCRIBE, { types: [...status.types], replyTo: context.id }));
        status.timer = setInterval(() => {
            for (const recipient of status.recipients) {
                context.send(recipient, createMessage(TICK));
            }
        }, status.intervalMs);
    }

    stop(): void {
        if (this.#status.timer !== null) {
            clearInterval(this.#status.timer);
            this.#status.timer = null;
        }
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === ROSTER_REPORT) {
            this.#status.recipients = readIds(message.payload);
            context.log(`реестр дал ${this.#status.recipients.length} агентов для тиков`);
            return;
        }
        if (message.type === ROSTER_UPDATE) {
            this.#merge(readAgents(message.payload), context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { intervalMs: this.#status.intervalMs, types: this.#status.types, recipients: this.#status.recipients.length };
    }

    #merge(agents: ReadonlyArray<{ readonly id: string; readonly type: string }>, context: ActorContext): void {
        const added: string[] = [];
        for (const agent of agents) {
            if (!this.#status.types.includes(agent.type) || this.#status.recipients.includes(agent.id)) {
                continue;
            }
            this.#status.recipients.push(agent.id);
            added.push(agent.id);
        }
        if (added.length > 0) {
            context.log(`новые агенты получат тики: ${added.join(', ')}`);
        }
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): TickAgent {
    return new TickAgent(options);
}
