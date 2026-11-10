import type { ActorId, Message } from '../protocol/message.ts';
import type { WorkerEvent } from '../protocol/worker.ts';

type PendingWaiter = {
    readonly resolve: (message: Message) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
};

export class PendingReplies {
    readonly #waiters = new Map<ActorId, PendingWaiter>();

    add(to: ActorId, timeoutMs: number): Promise<Message> {
        return new Promise<Message>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.#waiters.delete(to);
                reject(new Error(`агент ${to} не ответил за ${timeoutMs} мс`));
            }, timeoutMs);
            timer.unref?.();
            this.#waiters.set(to, { resolve, reject, timer });
        });
    }

    accept(from: ActorId, message: Message): boolean {
        const waiter = this.#waiters.get(from);
        if (!waiter) {
            return false;
        }
        this.#waiters.delete(from);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
        return true;
    }

    drop(error: Error): void {
        for (const waiter of this.#waiters.values()) {
            clearTimeout(waiter.timer);
            waiter.reject(error);
        }
        this.#waiters.clear();
    }
}
