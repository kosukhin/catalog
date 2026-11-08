/**
 * Контракт актора.
 *
 * Актор ничего не знает о других акторах: у него есть только `context.send`,
 * который кладёт сообщение в почтовый ящик адресата. Прямых вызовов методов
 * другого актора в системе нет — это и есть ActorModel в чистом виде.
 *
 * `AbstractActor` — удобная база: наследник реализует только `handle`, а
 * преобразование «сообщение → обработчик» берёт на себя базовый класс. Он же
 * бесплатно даёт ответ на `status-request`: любой агент умеет рассказать о своём
 * состоянии, не написав для этого ни строки.
 */

import { createMessage, STATUS_REQUEST, STATUS_REPORT, type ActorId, type Message, type StatusReport } from './protocol.ts';

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

    /**
     * Отвечает на запрос состояния, остальное отдаёт в `handle`.
     *
     * Протокол состояния общий для всех агентов: спрашивающий указывает свой
     * адрес в `replyTo`, а актор отвечает `status-report`. Поэтому дашборд может
     * опросить любой агент, ничего не зная о его типе.
     */
    receive(message: Message, context: ActorContext): void | Promise<void> {
        if (message.type === STATUS_REQUEST) {
            const replyTo = readReplyTo(message.payload);
            if (replyTo !== null) {
                const report: StatusReport = { id: context.id, type: this.type, details: this.describe() };
                context.send(replyTo, createMessage(STATUS_REPORT, report));
            }
            return;
        }
        return this.handle(message, context);
    }

    /** Обработка сообщения: единственная точка расширения для наследника. */
    protected abstract handle(message: Message, context: ActorContext): void | Promise<void>;

    /** Что агент рассказывает о себе на запрос состояния. */
    protected describe(): Readonly<Record<string, unknown>> {
        return {};
    }
}

/** Достаёт адрес для ответа из полезной нагрузки. */
function readReplyTo(payload: unknown): string | null {
    const replyTo = (payload as { replyTo?: unknown } | undefined)?.replyTo;
    return typeof replyTo === 'string' && replyTo.trim() !== '' ? replyTo : null;
}
