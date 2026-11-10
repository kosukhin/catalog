import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol/message.ts';
import { buildReport, phaseOf } from './day/report.ts';
import { DEFAULT_DAY_START_HOUR, DEFAULT_NIGHT_START_HOUR, readClock, readHour, readTimeScale } from './day/options.ts';
import type { DayPhase } from './day/types.ts';
import type { TimeReport } from './day/report.ts';

const AGENT_TYPE = 'DayAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const DAY_AGENT_ID = 'DayAgent-1';

export const TIME_REQUEST = 'time-request';

export const TIME_REPORT = 'time-report';

export type { DayPhase, TimeReport };

interface DayStatus {
    readonly now: () => Date;
    readonly timeScale: number;
    readonly dayStartHour: number;
    readonly nightStartHour: number;
    readonly origin: number;
}

export class DayAgent extends AbstractActor {
    readonly #status: DayStatus;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super(AGENT_TYPE);
        const dayStartHour = readHour(options.dayStartHour, DEFAULT_DAY_START_HOUR, 'dayStartHour');
        const nightStartHour = readHour(options.nightStartHour, DEFAULT_NIGHT_START_HOUR, 'nightStartHour');
        if (nightStartHour <= dayStartHour) {
            throw new Error('nightStartHour должен быть больше dayStartHour');
        }
        const now = readClock(options.now);
        this.#status = { now, timeScale: readTimeScale(options.timeScale), dayStartHour, nightStartHour, origin: now().getTime() };
    }

    state(): { readonly timeScale: number } {
        return { timeScale: this.#status.timeScale };
    }

    start(context: ActorContext): void {
        context.log(`время идёт в ${this.#status.timeScale}× быстрее реального`);
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
        return buildReport(moment, phaseOf(moment.getHours(), this.#status.dayStartHour, this.#status.nightStartHour));
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        const report = this.report();
        return { timeScale: this.#status.timeScale, weekday: report.weekday, hours: report.hours, minutes: report.minutes, phase: report.phase };
    }

    #virtualNow(): Date {
        const elapsed = this.#status.now().getTime() - this.#status.origin;
        return new Date(this.#status.origin + elapsed * this.#status.timeScale);
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): DayAgent {
    return new DayAgent(options);
}

function readReplyTo(payload: unknown): string | null {
    const candidate = payload as { replyTo?: unknown } | undefined;
    return typeof candidate?.replyTo === 'string' && candidate.replyTo.trim() !== '' ? candidate.replyTo : null;
}
