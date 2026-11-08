import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as dayAgent from '../agents/dayAgent.ts';
import { createMessage } from '../lib/protocol.ts';
import type { ActorContext } from '../lib/actor.ts';

const { DayAgent, DAY_AGENT_ID, TIME_REQUEST, TIME_REPORT } = dayAgent;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = DAY_AGENT_ID): Fixture {
    const log: string[] = [];
    const sent: Array<{ to: string; type: string; payload: unknown }> = [];
    const context: ActorContext = {
        id,
        send: (to, message): void => {
            sent.push({ to, type: message.type, payload: message.payload });
        },
        log: (text): void => {
            log.push(text);
        },
    };
    return { context, log, sent };
}

/** Часы, которые при каждом обращении уходят вперёд на шаг. */
function advancingClock(start: Date, stepMs: number): () => Date {
    let current = start.getTime();
    return () => {
        const moment = new Date(current);
        current += stepMs;
        return moment;
    };
}

/** Часы, показывающие заданный час. */
function clockAt(hours: number, minutes = 30): () => Date {
    return () => new Date(2026, 10, 8, hours, minutes);
}

describe('DayAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(dayAgent.type, 'DayAgent');
        assert.match(dayAgent.moduleUrl, /agents\/dayAgent\.ts$/);
        assert.equal(DAY_AGENT_ID, 'DayAgent-1');
        assert.equal(dayAgent.createAgent(DAY_AGENT_ID, {}).type, 'DayAgent');
        assert.equal(new DayAgent({ now: clockAt(12) }).type, 'DayAgent');
    });

    it('отдаёт число, месяц, день недели и время суток', () => {
        const agent = new DayAgent({ now: clockAt(14) });

        const report = agent.report();

        assert.equal(report.dayOfMonth, 8);
        assert.equal(report.month, 11);
        assert.equal(report.monthName, 'ноября');
        assert.equal(report.weekday, 'воскресенье');
        assert.equal(report.hours, 14);
        assert.equal(report.minutes, 30);
        assert.equal(report.phase, 'день');
    });

    it('считает ночь по настройкам, а не по «здравому смыслу»', () => {
        assert.equal(new DayAgent({ now: clockAt(3) }).report().phase, 'ночь');
        assert.equal(new DayAgent({ now: clockAt(23) }).report().phase, 'ночь');
        assert.equal(new DayAgent({ now: clockAt(6) }).report().phase, 'день');
        assert.equal(new DayAgent({ now: clockAt(21) }).report().phase, 'день');
        assert.equal(
            new DayAgent({ now: clockAt(14), dayStartHour: 15, nightStartHour: 20 }).report().phase,
            'ночь',
        );
    });

    it('на вопрос о времени отвечает тому, кто спросил', () => {
        const agent = new DayAgent({ now: clockAt(14) });
        const { context, sent } = createContext();

        agent.receive(createMessage(TIME_REQUEST, { replyTo: 'HumanAgent-1' }), context);

        assert.equal(sent.length, 1);
        assert.equal(sent[0]?.to, 'HumanAgent-1');
        assert.equal(sent[0]?.type, TIME_REPORT);
        assert.equal((sent[0]?.payload as { phase?: string } | undefined)?.phase, 'день');
    });

    it('не отвечает без обратного адреса и объясняет это в логе', () => {
        const agent = new DayAgent({ now: clockAt(14) });
        const { context, log, sent } = createContext();

        agent.receive(createMessage(TIME_REQUEST, {}), context);

        assert.equal(sent.length, 0);
        assert.match(log[0] ?? '', /без обратного адреса/);
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new DayAgent({ now: clockAt(14) });
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });

    it('сообщает темп времени и предупреждает, если создан не по своему адресу', () => {
        const agent = new DayAgent({ now: clockAt(14) });
        const correct = createContext();
        const wrong = createContext('DayAgent-2');

        agent.start(correct.context);
        agent.start(wrong.context);

        assert.equal(correct.log.length, 1);
        assert.match(correct.log[0] ?? '', /время идёт в 10× быстрее реального/);
        assert.match(wrong.log[1] ?? '', /ищут меня по адресу DayAgent-1/);
    });

    it('проверяет настройки', () => {
        assert.throws(() => new DayAgent({ now: 'часы' }), /now должен быть функцией/);
        assert.throws(() => new DayAgent({ dayStartHour: 25 }), /dayStartHour должен быть целым часом/);
        assert.throws(() => new DayAgent({ dayStartHour: 22, nightStartHour: 6 }), /больше dayStartHour/);
    });

    it('по умолчанию идёт в 10 раз быстрее реального времени', () => {
        const agent = new DayAgent({ now: advancingClock(new Date(2026, 10, 8, 14, 0), 6 * 60_000) });

        assert.equal(agent.timeScale, 10);
        assert.equal(agent.report().hours, 15, '6 реальных минут = 1 виртуальный час');
    });

    it('темп времени настраивается', () => {
        const fast = new DayAgent({ now: advancingClock(new Date(2026, 10, 8, 14, 0), 60_000), timeScale: 60 });
        const slow = new DayAgent({ now: advancingClock(new Date(2026, 10, 8, 14, 0), 30 * 60_000), timeScale: 2 });

        assert.equal(fast.timeScale, 60);
        assert.equal(fast.report().hours, 15, '1 реальная минута = 1 виртуальный час');
        assert.equal(slow.timeScale, 2);
        assert.equal(slow.report().hours, 15, '30 реальных минут = 1 виртуальный час');
    });

    it('время не прыгает: два отчёта идут друг за другом', () => {
        const agent = new DayAgent({ now: advancingClock(new Date(2026, 10, 8, 14, 0), 60_000), timeScale: 60 });

        assert.equal(agent.report().hours, 15);
        assert.equal(agent.report().hours, 16);
    });

    it('проверяет темп времени', () => {
        assert.throws(() => new DayAgent({ timeScale: 0 }), /timeScale должен быть положительным числом/);
        assert.throws(() => new DayAgent({ timeScale: -5 }), /timeScale должен быть положительным числом/);
        assert.throws(() => new DayAgent({ timeScale: Number.POSITIVE_INFINITY }), /timeScale должен быть положительным числом/);
        assert.throws(() => new DayAgent({ timeScale: 'быстро' }), /timeScale должен быть положительным числом/);
    });
});
