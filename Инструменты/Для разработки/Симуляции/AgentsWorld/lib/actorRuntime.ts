import { Mailbox } from './mailbox.ts';
import type { Actor, ActorContext } from './actor.ts';
import type { ActorId, Message } from './protocol.ts';

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

export class ActorRuntime {
    readonly #actor: Actor;
    readonly #ports: ActorPorts;
    readonly #mailbox = new Mailbox();
    readonly #context: ActorContext;
    #loop: Promise<void> | null = null;
    #stopped = false;

    constructor(options: ActorRuntimeOptions) {
        this.#actor = options.actor;
        this.#ports = options.ports;
        this.#context = {
            id: options.id,
            send: (to: ActorId, message: Message): void => {
                this.#ports.send(to, message);
            },
            log: (text: string): void => {
                this.#ports.log(text);
            },
        };
    }

    get id(): ActorId {
        return this.#context.id;
    }

    get type(): string {
        return this.#actor.type;
    }

    get pending(): number {
        return this.#mailbox.size;
    }

    get context(): ActorContext {
        return this.#context;
    }

    async start(): Promise<void> {
        if (this.#loop) {
            throw new Error(`актор ${this.id} уже запущен`);
        }
        await this.#actor.start?.(this.#context);
        this.#loop = this.#pump();
    }

    deliver(from: ActorId, message: Message): boolean {
        if (this.#stopped) {
            return false;
        }
        return this.#mailbox.put({ from, message });
    }

    async stop(): Promise<void> {
        if (this.#stopped) {
            return;
        }
        this.#stopped = true;
        this.#mailbox.close();
        await this.#loop;
        await this.#actor.stop?.(this.#context);
    }

    async #pump(): Promise<void> {
        for (;;) {
            const envelope = await this.#mailbox.take();
            if (envelope === undefined) {
                return;
            }
            try {
                await this.#actor.receive(envelope.message, this.#context);
            } catch (error) {
                this.#ports.onError(this.id, error);
            }
        }
    }
}
