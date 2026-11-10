import { Mailbox } from './mailbox.ts';
import type { Actor, ActorContext } from './actor.ts';
import type { ActorId, Message } from './protocol/message.ts';
import { createContext } from './runtime/createContext.ts';
import { pump } from './runtime/pump.ts';

export interface ActorPorts {
    send(to: ActorId, message: Message): void;
    log(text: string): void;
    onError(actorId: ActorId, error: unknown): void;
}

export interface ActorRuntimeOptions {
    readonly id: ActorId;
    readonly actor: Actor;
    readonly ports: ActorPorts;
}

interface RunStatus {
    readonly mailbox: Mailbox;
    loop: Promise<void> | null;
    stopped: boolean;
}

export interface RuntimeReport {
    readonly id: ActorId;
    readonly type: string;
    readonly pending: number;
    readonly context: ActorContext;
}

export class ActorRuntime {
    readonly #actor: Actor;
    readonly #ports: ActorPorts;
    readonly #context: ActorContext;
    readonly #status: RunStatus = { mailbox: new Mailbox(), loop: null, stopped: false };

    constructor(options: ActorRuntimeOptions) {
        this.#actor = options.actor;
        this.#ports = options.ports;
        this.#context = createContext(options.id, {
            send: (to: ActorId, message: Message): void => {
                options.ports.send(to, message);
            },
            log: (text: string): void => {
                options.ports.log(text);
            },
        });
    }

    state(): RuntimeReport {
        return {
            id: this.#context.id,
            type: this.#actor.type,
            pending: this.#status.mailbox.pending(),
            context: this.#context,
        };
    }

    async start(): Promise<void> {
        if (this.#status.loop) {
            throw new Error(`актор ${this.#context.id} уже запущен`);
        }
        await this.#actor.start?.(this.#context);
        this.#status.loop = pump(this.#status.mailbox, this.#actor, this.#context, (error: unknown): void => {
            this.#ports.onError(this.#context.id, error);
        });
    }

    deliver(from: ActorId, message: Message): boolean {
        if (this.#status.stopped) {
            return false;
        }
        return this.#status.mailbox.put({ from, message });
    }

    async stop(): Promise<void> {
        if (this.#status.stopped) {
            return;
        }
        this.#status.stopped = true;
        this.#status.mailbox.close();
        await this.#status.loop;
        await this.#actor.stop?.(this.#context);
    }
}

