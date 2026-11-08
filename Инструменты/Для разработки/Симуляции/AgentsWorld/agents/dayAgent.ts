/**
 * DayAgent — единственный в мире источник времени.
 *
 * Отвечает на вопрос «какое сейчас время»: число, месяц, день недели, часы/минуты
 * и время суток (день или ночь). Любой агент может спросить его, чтобы принять
 * своё решение — например, HumanAgent по ответу решает, спать ему или быть
 * активным.
 *
 * Агент создаётся в единственном экземпляре, поэтому у него постоянный адрес
 * `DAY_AGENT_ID`: другие агенты обращаются именно к нему.
 *
 * Как и все акторы, он не вызывается напрямую: вопрос приходит сообщением
 * `time-request` в его почтовый ящик, ответ уходит сообщением `time-report` тому,
 * кто спросил. Адрес для ответа лежит в `payload.replyTo`, потому что контракт
 * актора не передаёт отправителя в обработчик.
 */

import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

/** Имя типа: под ним агент указывается в составе мира. */
const AGENT_TYPE = 'DayAgent';

/** Экспорт `type` — часть контракта модуля агента (`lib/agentPlugin.ts`). */
export const type = AGENT_TYPE;

/** Адрес модуля: по нему поток загружает код агента. */
export const moduleUrl = import.meta.url;

/** Постоянный адрес единственного экземпляра: другие агенты ищут его по нему. */
export const DAY_AGENT_ID = 'DayAgent-1';

/** Тип сообщения-вопроса: полезная нагрузка — `{ replyTo }`. */
export const TIME_REQUEST = 'time-request';

/** Тип сообщения-ответа: полезная нагрузка — `TimeReport`. */
export const TIME_REPORT = 'time-report';

/** Время суток. */
export type DayPhase = 'день' | 'ночь';

/** Ответ на вопрос о времени. */
export interface TimeReport {
    /** Момент времени в ISO-формате. */
    readonly iso: string;
    readonly year: number;
    /** Месяц числом, 1–12. */
    readonly month: number;
    /** Название месяца по-русски: «ноября». */
    readonly monthName: string;
    /** Число месяца. */
    readonly dayOfMonth: number;
    /** День недели по-русски. */
    readonly weekday: string;
    readonly hours: number;
    readonly minutes: number;
    /** Время суток, вычисленное по настройкам агента. */
    readonly phase: DayPhase;
}

/** Настройки агента. */
export interface DayAgentOptions {
    /** Часы агента; по умолчанию — системные. Подменяются в тестах. */
    readonly now: () => Date;
    /** Во сколько раз время агента быстрее реального (по умолчанию 10). */
    readonly timeScale: number;
    /** Час, с которого начинается день (по умолчанию 6). */
    readonly dayStartHour: number;
    /** Час, с которого начинается ночь (по умолчанию 22). */
    readonly nightStartHour: number;
}

/** Дни недели в порядке `Date.getDay()` — от воскресенья. */
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/** Месяцы по-русски в порядке `Date.getMonth()`. */
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** Во сколько раз время агента быстрее реального по умолчанию. */
const DEFAULT_TIME_SCALE = 10;

const DEFAULT_DAY_START_HOUR = 6;
const DEFAULT_NIGHT_START_HOUR = 22;

export class DayAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #now: () => Date;
    readonly #dayStartHour: number;
    readonly #nightStartHour: number;
    readonly #timeScale: number;
    /** Момент запуска виртуальных часов: от него считается ускорение. */
    readonly #origin: number;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#now = readClock(options.now);
        this.#timeScale = readTimeScale(options.timeScale);
        this.#origin = this.#now().getTime();
        this.#dayStartHour = readHour(options.dayStartHour, DEFAULT_DAY_START_HOUR, 'dayStartHour');
        this.#nightStartHour = readHour(options.nightStartHour, DEFAULT_NIGHT_START_HOUR, 'nightStartHour');
        if (this.#nightStartHour <= this.#dayStartHour) {
            throw new Error('nightStartHour должен быть больше dayStartHour');
        }
    }

    /** Сколько виртуальных миллисекунд проходит за одну реальную. */
    get timeScale(): number {
        return this.#timeScale;
    }

    /** Сообщает темп времени и предупреждает, если агент создан не по своему адресу. */
    start(context: ActorContext): void {
        context.log(`время идёт в ${this.#timeScale}× быстрее реального`);
        if (context.id !== DAY_AGENT_ID) {
            context.log(`меня создали как ${context.id}, но остальные ищут меня по адресу ${DAY_AGENT_ID}`);
        }
    }

    /** Отвечает на вопрос о времени. */
    protected override handle(message: Message, context: ActorContext): void {
        if (message.type !== TIME_REQUEST) {
            context.log(`не знаю, что делать с сообщением «${message.type}»`);
            return;
        }
        const replyTo = readReplyTo(message.payload);
        if (replyTo === null) {
            context.log('спросили время без обратного адреса, ответить некому');
            return;
        }
        context.send(replyTo, createMessage(TIME_REPORT, this.report()));
    }

    /** Собирает отчёт о текущем времени. */
    report(): TimeReport {
        const moment = this.#virtualNow();
        const hours = moment.getHours();
        return {
            iso: moment.toISOString(),
            year: moment.getFullYear(),
            month: moment.getMonth() + 1,
            monthName: MONTHS[moment.getMonth()] ?? '',
            dayOfMonth: moment.getDate(),
            weekday: WEEKDAYS[moment.getDay()] ?? '',
            hours,
            minutes: moment.getMinutes(),
            phase: this.#phaseOf(hours),
        };
    }

    /** Что показывать в дашборде: темп времени и текущее виртуальное время. */
    protected override describe(): Readonly<Record<string, unknown>> {
        const report = this.report();
        return { timeScale: this.#timeScale, weekday: report.weekday, hours: report.hours, minutes: report.minutes, phase: report.phase };
    }

    /**
     * Виртуальное «сейчас»: реальное время, умноженное на `timeScale`.
     *
     * Точка отсчёта — момент создания агента, поэтому мир живёт ускоренно, но не
     * «прыгает» при каждом вопросе: два вопроса подряд покажут разное время.
     */
    #virtualNow(): Date {
        const elapsed = this.#now().getTime() - this.#origin;
        return new Date(this.#origin + elapsed * this.#timeScale);
    }

    /** Определяет время суток по часу. */
    #phaseOf(hours: number): DayPhase {
        return hours >= this.#dayStartHour && hours < this.#nightStartHour ? 'день' : 'ночь';
    }
}

/** Создаёт агента: этого ждёт загрузчик модуля. */
export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): DayAgent {
    return new DayAgent(options);
}

/** Достаёт адрес для ответа из полезной нагрузки. */
function readReplyTo(payload: unknown): string | null {
    const candidate = payload as { replyTo?: unknown } | undefined;
    return typeof candidate?.replyTo === 'string' && candidate.replyTo.trim() !== '' ? candidate.replyTo : null;
}

/** Читает часы агента. */
function readClock(value: unknown): () => Date {
    if (value === undefined) {
        return () => new Date();
    }
    if (typeof value !== 'function') {
        throw new Error('now должен быть функцией, возвращающей Date');
    }
    return value as () => Date;
}

/** Читает темп времени: положительное конечное число. */
function readTimeScale(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_TIME_SCALE;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error('timeScale должен быть положительным числом');
    }
    return value;
}

/** Читает час настройки, проверяя диапазон 0–23. */
function readHour(value: unknown, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 23) {
        throw new Error(`${name} должен быть целым часом от 0 до 23`);
    }
    return value;
}

