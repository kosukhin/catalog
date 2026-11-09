import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, TICK, type Message } from '../lib/protocol.ts';

const AGENT_TYPE = 'TickAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const TICK_AGENT_ID = 'TickAgent-1';

const DEFAULT_INTERVAL_MS = 1000;

export interface TickAgentOptions {
    readonly intervalMs: number;
    readonly recipients: readonly string[];
}

export class TickAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #intervalMs: number;
    readonly #recipients: readonly string[];
    #timer: ReturnType<typeof setInterval> | null = null;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#intervalMs = readInterval(options.intervalMs);
        this.#recipients = readRecipients(options.recipients);
    }

    get intervalMs(): number {
        return this.#intervalMs;
    }

    get recipientCount(): number {
        return this.#recipients.length;
    }

    start(context: ActorContext): void {
        if (this.#recipients.length === 0) {
            context.log('некого будить: список адресатов пуст');
            return;
        }
        context.log(`бужу ${this.#recipients.length} агентов каждые ${this.#intervalMs} мс`);
        this.#timer = setInterval(() => {
            for (const recipient of this.#recipients) {
                context.send(recipient, createMessage(TICK));
            }
        }, this.#intervalMs);
    }

    stop(): void {
        if (this.#timer !== null) {
            clearInterval(this.#timer);
            this.#timer = null;
        }
    }

    protected override handle(message: Message, context: ActorContext): void {
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    describeForDashboard(): Readonly<Record<string, unknown>> {
        return this.describe();
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { intervalMs: this.#intervalMs, recipients: this.#recipients.length };
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): TickAgent {
    return new TickAgent(options);
}

function readInterval(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_INTERVAL_MS;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error('intervalMs должен быть целым положительным числом миллисекунд');
    }
    return value;
}

function readRecipients(value: unknown): readonly string[] {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error('recipients должен быть массивом адресов агентов');
    }
    const recipients: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string' || item.trim() === '') {
            throw new Error('каждый адресат в recipients должен быть непустой строкой');
        }
        recipients.push(item);
    }
    return recipients;
}
