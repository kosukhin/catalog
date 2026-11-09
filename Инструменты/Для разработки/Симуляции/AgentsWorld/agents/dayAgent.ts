import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

const AGENT_TYPE = 'DayAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const DAY_AGENT_ID = 'DayAgent-1';

export const TIME_REQUEST = 'time-request';

export const TIME_REPORT = 'time-report';

export type DayPhase = 'день' | 'ночь';

export interface TimeReport {
    readonly iso: string;
    readonly year: number;
    readonly month: number;
    readonly monthName: string;
    readonly dayOfMonth: number;
    readonly weekday: string;
    readonly hours: number;
    readonly minutes: number;
    readonly phase: DayPhase;
}

export interface DayAgentOptions {
    readonly now: () => Date;
    readonly timeScale: number;
    readonly dayStartHour: number;
    readonly nightStartHour: number;
}

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const DEFAULT_TIME_SCALE = 10;

const DEFAULT_DAY_START_HOUR = 6;
const DEFAULT_NIGHT_START_HOUR = 22;

export class DayAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #now: () => Date;
    readonly #dayStartHour: number;
    readonly #nightStartHour: number;
    readonly #timeScale: number;
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

    get timeScale(): number {
        return this.#timeScale;
    }

    start(context: ActorContext): void {
        context.log(`время идёт в ${this.#timeScale}× быстрее реального`);
        if (context.id !== DAY_AGENT_ID) {
            context.log(`меня создали как ${context.id}, но остальные ищут меня по адресу ${DAY_AGENT_ID}`);
        }
    }

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

    protected override describe(): Readonly<Record<string, unknown>> {
        const report = this.report();
        return { timeScale: this.#timeScale, weekday: report.weekday, hours: report.hours, minutes: report.minutes, phase: report.phase };
    }

    #virtualNow(): Date {
        const elapsed = this.#now().getTime() - this.#origin;
        return new Date(this.#origin + elapsed * this.#timeScale);
    }

    #phaseOf(hours: number): DayPhase {
        return hours >= this.#dayStartHour && hours < this.#nightStartHour ? 'день' : 'ночь';
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): DayAgent {
    return new DayAgent(options);
}

function readReplyTo(payload: unknown): string | null {
    const candidate = payload as { replyTo?: unknown } | undefined;
    return typeof candidate?.replyTo === 'string' && candidate.replyTo.trim() !== '' ? candidate.replyTo : null;
}

function readClock(value: unknown): () => Date {
    if (value === undefined) {
        return () => new Date();
    }
    if (typeof value !== 'function') {
        throw new Error('now должен быть функцией, возвращающей Date');
    }
    return value as () => Date;
}

function readTimeScale(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_TIME_SCALE;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error('timeScale должен быть положительным числом');
    }
    return value;
}

function readHour(value: unknown, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 23) {
        throw new Error(`${name} должен быть целым часом от 0 до 23`);
    }
    return value;
}

