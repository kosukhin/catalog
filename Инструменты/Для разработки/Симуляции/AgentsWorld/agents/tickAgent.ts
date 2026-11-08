/**
 * TickAgent — единственный в мире источник импульсов времени.
 *
 * Агенты в этой системе пассивны: они реагируют на сообщения, но не «тикают» сами.
 * Поэтому всё, что должно происходить регулярно (человек просыпается, проверяет
 * время, меняет занятие), нуждается в генераторе импульсов — это он.
 *
 * Каждый `intervalMs` агент отправляет сообщение `tick` всем адресатам из списка
 * `recipients`. Кого будить — решает не он, а тот, кто собирает мир: адреса
 * приходят настройками (`options`) в составе мира.
 *
 * Почему отдельный агент, а не таймер внутри человека:
 * — один таймер на мир вместо N таймеров по потокам;
 * — частоту можно менять, не трогая агентов;
 * — агенты остаются простыми: «пришёл тик — отреагировал».
 */

import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, TICK, type Message } from '../lib/protocol.ts';

/** Имя типа: под ним агент указывается в составе мира. */
const AGENT_TYPE = 'TickAgent';

/** Экспорт `type` — часть контракта модуля агента (`lib/agentPlugin.ts`). */
export const type = AGENT_TYPE;

/** Адрес модуля: по нему поток загружает код агента. */
export const moduleUrl = import.meta.url;

/** Постоянный адрес единственного тикера. */
export const TICK_AGENT_ID = 'TickAgent-1';

/** Период импульсов по умолчанию, мс. */
const DEFAULT_INTERVAL_MS = 1000;

/** Настройки агента. */
export interface TickAgentOptions {
    /** Как часто рассылать импульсы, мс. */
    readonly intervalMs: number;
    /** Кого будить: адреса агентов в мире. */
    readonly recipients: readonly string[];
}

export class TickAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #intervalMs: number;
    readonly #recipients: readonly string[];
    #timer: ReturnType<typeof setInterval> | null = null;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#intervalMs = readInterval(options.intervalMs);
        this.#recipients = readRecipients(options.recipients);
    }

    /** Период импульсов в миллисекундах. */
    get intervalMs(): number {
        return this.#intervalMs;
    }

    /** Сколько агентов получает импульсы. */
    get recipientCount(): number {
        return this.#recipients.length;
    }

    /** Запускает таймер и начинает рассылать `tick`. */
    start(context: ActorContext): void {
        if (this.#recipients.length === 0) {
            context.log('некого будить: список адресатов пуст');
            return;
        }
        context.log(`бужу ${this.#recipients.length} агентов каждые ${this.#intervalMs} мс`);
        this.#timer = setInterval(() => {
            for (const recipient of this.#recipients) {
                context.send(recipient, createMessage(TICK));
            }
        }, this.#intervalMs);
    }

    /** Останавливает таймер: после остановки импульсов не будет. */
    stop(): void {
        if (this.#timer !== null) {
            clearInterval(this.#timer);
            this.#timer = null;
        }
    }

    /** Работает по таймеру; входящие сообщения ему не нужны. */
    protected override handle(message: Message, context: ActorContext): void {
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    /** Открывает `describe` для тестов и внешних проверок. */
    describeForDashboard(): Readonly<Record<string, unknown>> {
        return this.describe();
    }

    /** Что показывать в дашборде: частота и число адресатов. */
    protected override describe(): Readonly<Record<string, unknown>> {
        return { intervalMs: this.#intervalMs, recipients: this.#recipients.length };
    }
}

/** Создаёт агента: этого ждёт загрузчик модуля. */
export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): TickAgent {
    return new TickAgent(options);
}

/** Читает период импульсов. */
function readInterval(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_INTERVAL_MS;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error('intervalMs должен быть целым положительным числом миллисекунд');
    }
    return value;
}

/** Читает список адресатов. */
function readRecipients(value: unknown): readonly string[] {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error('recipients должен быть массивом адресов агентов');
    }
    const recipients: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string' || item.trim() === '') {
            throw new Error('каждый адресат в recipients должен быть непустой строкой');
        }
        recipients.push(item);
    }
    return recipients;
}
