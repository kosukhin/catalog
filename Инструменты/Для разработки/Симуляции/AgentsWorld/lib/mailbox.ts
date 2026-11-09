import type { ActorId, Message } from './protocol.ts';

export interface Envelope {
    readonly from: ActorId;
    readonly message: Message;
}

export class Mailbox {
    #queue: Envelope[] = [];
    #waiters: Array<(envelope: Envelope | undefined) => void> = [];
    #closed = false;

    get size(): number {
        return this.#queue.length;
    }

    get closed(): boolean {
        return this.#closed;
    }

    put(envelope: Envelope): boolean {
        if (this.#closed) {
            return false;
        }
        const waiter = this.#waiters.shift();
        if (waiter) {
            waiter(envelope);
            return true;
        }
        this.#queue.push(envelope);
        return true;
    }

    take(): Promise<Envelope | undefined> {
        const envelope = this.#queue.shift();
        if (envelope) {
            return Promise.resolve(envelope);
        }
        if (this.#closed) {
            return Promise.resolve(undefined);
        }
        return new Promise((resolve) => {
            this.#waiters.push(resolve);
        });
    }

    close(): void {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        const waiters = this.#waiters;
        this.#waiters = [];
        for (const waiter of waiters) {
            waiter(undefined);
        }
    }
}
