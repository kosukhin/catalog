/**
 * EchoAgent — простейший тестовый агент.
 *
 * Ничего не умеет, кроме разговора с самим собой: при старте он пишет приветствие
 * в лог и отправляет себе несколько сообщений `echo` в собственный почтовый ящик,
 * а затем печатает их обратно. Это минимальный пример того, что актор общается
 * только сообщениями — даже «сам с собой» он говорит через ящик.
 *
 * Агент специально ничего не печатает в stdout напрямую: строки уходят в
 * `context.log`, а печатью занимается мир. Иначе вывод воркеров перемешивался бы
 * и тесты не могли бы его проверить.
 */

import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

/** Ключ, под которым агент регистрируется в реестре. */
export const ECHO_AGENT_TYPE = 'EchoAgent';

/** Настройки агента. */
export interface EchoAgentOptions {
    /** Сколько сообщений отправить себе при старте (по умолчанию 2). */
    readonly greetings: number;
}

/** Сколько приветствий по умолчанию. */
const DEFAULT_GREETINGS = 2;

export class EchoAgent extends AbstractActor {
    readonly type = ECHO_AGENT_TYPE;
    /** Сколько сообщений агент отправит себе при старте. */
    readonly #greetings: number;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#greetings = readGreetings(options.greetings);
    }

    /** Пишет приветствие и ставит себе в ящик `greetings` сообщений. */
    start(context: ActorContext): void {
        context.log(`привет, я ${context.id} и я печатаю ${this.#greetings} сообщения`);
        for (let index = 1; index <= this.#greetings; index += 1) {
            context.send(context.id, createMessage('echo', { text: `${context.id}: сообщение ${index}` }));
        }
    }

    /** Печатает текст входящего сообщения `echo`. */
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

/** Читает настройку `greetings`, отсекая мусор на входе. */
function readGreetings(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_GREETINGS;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new Error('greetings должен быть целым неотрицательным числом');
    }
    return value;
}
