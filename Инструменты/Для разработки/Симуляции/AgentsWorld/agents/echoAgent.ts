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

/** Имя типа: под ним агент указывается в статистике мира. */
const AGENT_TYPE = 'EchoAgent';

/**
 * Экспорт `type` — часть контракта модуля агента (см. `lib/agentPlugin.ts`).
 *
 * Мир получает это имя как строку и ничего не знает о классе.
 */
export const type = AGENT_TYPE;

/**
 * Экспорт `moduleUrl` — тоже часть контракта.
 *
 * Адрес своего модуля: его получает поток и загружает по нему код агента, потому
 * что передать класс в другой поток нельзя.
 */
export const moduleUrl = import.meta.url;

/** Настройки агента. */
export interface EchoAgentOptions {
    /** Сколько сообщений отправить себе при старте (по умолчанию 2). */
    readonly greetings: number;
}

/** Сколько приветствий по умолчанию. */
const DEFAULT_GREETINGS = 2;

export class EchoAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
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

    /** Что показывать в дашборде: сколько сообщений агент печатает сам себе. */
    protected override describe(): Readonly<Record<string, unknown>> {
        return { greetings: this.#greetings };
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

/**
 * Экспорт `createAgent` — третья часть контракта модуля агента.
 *
 * Именно эту функцию вызывает поток, загрузив модуль по `moduleUrl`. Идентификатор
 * агенту не нужен: он приходит в `context.id` при первом же сообщении.
 */
export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): EchoAgent {
    return new EchoAgent(options);
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
