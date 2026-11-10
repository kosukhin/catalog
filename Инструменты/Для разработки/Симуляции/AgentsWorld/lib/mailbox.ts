import type { ActorId, Message } from './protocol/message.ts';

export interface Envelope {
    readonly from: ActorId;
    readonly message: Message;
}

export class Mailbox {
    readonly #queued: Envelope[] = [];
    readonly #waiters: Array<(envelope: Envelope | undefined) => void> = [];
    #closed = false;

    put(envelope: Envelope): boolean {
        if (this.#closed) {
            return false;
        }
        const waiter = this.#waiters.shift();
        if (waiter) {
            waiter(envelope);
            return true;
        }
        this.#queued.push(envelope);
        return true;
    }

    take(): Promise<Envelope | undefined> {
        const envelope = this.#queued.shift();
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
        const waiters = [...this.#waiters];
        this.#waiters.length = 0;
        for (const waiter of waiters) {
            waiter(undefined);
        }
    }

    pending(): number {
        return this.#queued.length;
    }
}

