import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

const AGENT_TYPE = 'EchoAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export interface EchoAgentOptions {
    readonly greetings: number;
}

const DEFAULT_GREETINGS = 2;

export class EchoAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #greetings: number;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#greetings = readGreetings(options.greetings);
    }

    start(context: ActorContext): void {
        context.log(`привет, я ${context.id} и я печатаю ${this.#greetings} сообщения`);
        for (let index = 1; index <= this.#greetings; index += 1) {
            context.send(context.id, createMessage('echo', { text: `${context.id}: сообщение ${index}` }));
        }
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { greetings: this.#greetings };
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type !== 'echo') {
            context.log(`не знаю, что делать с сообщением «${message.type}»`);
            return;
        }
        const payload = message.payload as { text?: unknown } | undefined;
        const text = typeof payload?.text === 'string' ? payload.text : '(без текста)';
        context.log(`эхо: ${text}`);
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): EchoAgent {
    return new EchoAgent(options);
}

function readGreetings(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_GREETINGS;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new Error('greetings должен быть целым неотрицательным числом');
    }
    return value;
}
