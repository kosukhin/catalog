/**
 * Почтовый цикл одного актора — связка «почтовый ящик + актор».
 *
 * Рантайм даёт актору три вещи: свой ящик, контекст (`send`/`log`) и цикл,
 * который последовательно вынимает сообщения и передаёт их в `receive`.
 *
 * Важно, что цикл последовательный: актор обрабатывает одно сообщение за раз,
 * поэтому его внутреннее состояние не приходится защищать блокировками. Параллелизм
 * достигается не внутри актора, а между акторами — они живут на разных потоках.
 *
 * Ошибка в `receive` не убивает цикл: она уходит в `ports.onError`, а следующее
 * сообщение всё равно будет обработано — иначе один сбойный обработчик остановил
 * бы весь поток.
 */

import { Mailbox } from './mailbox.ts';
import type { Actor, ActorContext } from './actor.ts';
import type { ActorId, Message } from './protocol.ts';

/** Внешние зависимости рантайма: доставка в другой поток, лог и обработка сбоев. */
export interface ActorPorts {
    /** Отправить сообщение актору, которого нет в этом потоке. */
    send(to: ActorId, message: Message): void;
    /** Записать строку в лог мира. */
    log(text: string): void;
    /** Сообщить о сбое в обработчике актора. */
    onError(actorId: ActorId, error: unknown): void;
}

/** Параметры создания рантайма актора. */
export interface ActorRuntimeOptions {
    /** Идентификатор актора. */
    readonly id: ActorId;
    /** Экземпляр актора. */
    readonly actor: Actor;
    /** Внешние зависимости. */
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

    /** Идентификатор актора. */
    get id(): ActorId {
        return this.#context.id;
    }

    /** Тип актора — тот, под которым он создан реестром. */
    get type(): string {
        return this.#actor.type;
    }

    /** Сколько сообщений ещё не обработано. */
    get pending(): number {
        return this.#mailbox.size;
    }

    /** Контекст актора: нужен тестам и тем, кто хочет отправить сообщение напрямую. */
    get context(): ActorContext {
        return this.#context;
    }

    /** Запускает актора (`start`) и поднимает почтовый цикл. */
    async start(): Promise<void> {
        if (this.#loop) {
            throw new Error(`актор ${this.id} уже запущен`);
        }
        await this.#actor.start?.(this.#context);
        this.#loop = this.#pump();
    }

    /**
     * Кладёт сообщение в ящик актора.
     *
     * @returns `false`, если актор уже остановлен
     */
    deliver(from: ActorId, message: Message): boolean {
        if (this.#stopped) {
            return false;
        }
        return this.#mailbox.put({ from, message });
    }

    /** Останавливает актора: закрывает ящик, дожидается цикла, зовёт `stop`. */
    async stop(): Promise<void> {
        if (this.#stopped) {
            return;
        }
        this.#stopped = true;
        this.#mailbox.close();
        await this.#loop;
        await this.#actor.stop?.(this.#context);
    }

    /** Цикл обработки: берёт сообщение, отдаёт актору, повторяет до закрытия ящика. */
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
