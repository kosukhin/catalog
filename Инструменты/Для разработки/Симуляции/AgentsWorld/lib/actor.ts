/**
 * Контракт актора.
 *
 * Актор ничего не знает о других акторах: у него есть только `context.send`,
 * который кладёт сообщение в почтовый ящик адресата. Прямых вызовов методов
 * другого актора в системе нет — это и есть ActorModel в чистом виде.
 *
 * `AbstractActor` — удобная база: наследник реализует только `handle`, а
 * преобразование «сообщение → обработчик» берёт на себя базовый класс.
 */

import type { ActorId, Message } from './protocol.ts';

/** То, что актор получает от рантайма: свой id и способы связи с миром. */
export interface ActorContext {
    /** Идентификатор самого актора. */
    readonly id: ActorId;
    /** Отправить сообщение в почтовый ящик другого актора. */
    send(to: ActorId, message: Message): void;
    /** Написать строку в лог мира (это не сообщение актору, а телеметрия). */
    log(text: string): void;
}

/** Актор: пассивный получатель сообщений. */
export interface Actor {
    /** Тип агента — ключ, под которым он зарегистрирован в реестре. */
    readonly type: string;
    /** Вызывается один раз при запуске, до первого сообщения. */
    start?(context: ActorContext): void | Promise<void>;
    /** Обрабатывает одно сообщение из своего почтового ящика. */
    receive(message: Message, context: ActorContext): void | Promise<void>;
    /** Вызывается при остановке мира, после обработки последнего сообщения. */
    stop?(context: ActorContext): void | Promise<void>;
}

/** Фабрика актора: реестр создаёт экземпляры по типу. */
export type ActorFactory = (id: ActorId, options: Readonly<Record<string, unknown>>) => Actor;

/** База для акторов, которым достаточно обработать сообщение. */
export abstract class AbstractActor implements Actor {
    /** Тип агента, задаётся наследником. */
    abstract readonly type: string;

    /** Приводит сообщение к обработчику `handle`. */
    receive(message: Message, context: ActorContext): void | Promise<void> {
        return this.handle(message, context);
    }

    /** Обработка сообщения: единственная точка расширения для наследника. */
    protected abstract handle(message: Message, context: ActorContext): void | Promise<void>;
}
