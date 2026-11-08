/**
 * Почтовый ящик актора — очередь входящих сообщений.
 *
 * Реализует главное правило ActorModel: сообщение не вызывается, а «кладётся» в
 * ящик получателя. Отправитель не ждёт обработки и не знает, когда она случится.
 *
 * Ящик совмещает две стратегии:
 * — если актор сейчас ждёт (`take` без сообщений), сообщение отдаётся ожидающему
 *   сразу, без промежуточной очереди;
 * — иначе сообщение встаёт в очередь и будет выдано в порядке FIFO.
 *
 * `close()` — мягкая остановка: уже накопленные сообщения ещё можно забрать,
 * а `take` на пустом закрытом ящике возвращает `undefined`, и цикл актора
 * корректно завершается.
 */

import type { ActorId, Message } from './protocol.ts';

/** Конверт: сообщение вместе с тем, кто его отправил. */
export interface Envelope {
    /** Идентификатор актора-отправителя. */
    readonly from: ActorId;
    /** Само сообщение. */
    readonly message: Message;
}

export class Mailbox {
    /** Сообщения, ожидающие обработки. */
    #queue: Envelope[] = [];
    /** Акторы, которые ждут сообщения прямо сейчас. */
    #waiters: Array<(envelope: Envelope | undefined) => void> = [];
    /** Признак закрытого ящика: новые сообщения не принимаются. */
    #closed = false;

    /** Сколько сообщений ждёт обработки (не считая уже отданных ожидающим). */
    get size(): number {
        return this.#queue.length;
    }

    /** Закрыт ли ящик. */
    get closed(): boolean {
        return this.#closed;
    }

    /**
     * Кладёт сообщение в ящик.
     *
     * @returns `false`, если ящик закрыт и сообщение отброшено
     */
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

    /**
     * Забирает следующее сообщение, ожидая его появления.
     *
     * @returns конверт или `undefined`, если ящик закрыт и очередь пуста
     */
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

    /** Закрывает ящик и будит всех ожидающих: новых сообщений не будет. */
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
