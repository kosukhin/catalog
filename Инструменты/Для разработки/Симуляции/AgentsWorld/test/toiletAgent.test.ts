import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as toilet from '../agents/toiletAgent.ts';
import { DAY_AGENT_ID, TIME_REQUEST, TIME_REPORT } from '../agents/dayAgent.ts';
import { PHYSICS_AGENT_ID, PHYSICS_REGISTER } from '../agents/physicsAgent.ts';
import { createMessage, TICK, STATUS_REQUEST, STATUS_REPORT } from '../lib/protocol.ts';
import type { ActorContext } from '../lib/actor.ts';

const {
    ToiletAgent,
    TOILET_AGENT_ID,
    TOILET_REQUEST,
    TOILET_GRANTED,
    TOILET_QUEUED,
    TOILET_ENTER,
    TOILET_LEAVE,
    TOILET_RELEASED,
} = toilet;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = TOILET_AGENT_ID): Fixture {
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

function lastOf(sent: Fixture['sent'], type: string): { to: string; payload: unknown } | undefined {
    return sent.filter((item) => item.type === type).at(-1);
}

function gameTime(hours: number, minutes: number): string {
    return new Date(Date.UTC(2026, 0, 1, hours, minutes)).toISOString();
}

describe('ToiletAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(toilet.type, 'ToiletAgent');
        assert.match(toilet.moduleUrl, /agents\/toiletAgent\.ts$/);
        assert.equal(TOILET_AGENT_ID, 'ToiletAgent-1');
        assert.equal(toilet.createAgent(TOILET_AGENT_ID, {}).type, 'ToiletAgent');
    });

    it('при старте встаёт в пространство', () => {
        const agent = new ToiletAgent({ position: { x: 50, y: 0, z: 0 } });
        const { context, sent } = createContext();

        agent.start(context);

        assert.equal(lastOf(sent, PHYSICS_REGISTER)?.to, PHYSICS_AGENT_ID);
        assert.deepEqual(lastOf(sent, PHYSICS_REGISTER)?.payload, { id: TOILET_AGENT_ID, position: { x: 50, y: 0, z: 0 } });
    });

    it('первого пускает, второго ставит в очередь', () => {
        const agent = new ToiletAgent();
        const { context, sent } = createContext();

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), context);
        assert.equal(lastOf(sent, TOILET_GRANTED)?.to, 'H1');
        assert.equal(agent.queueLength, 0);

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H2', replyTo: 'H2' }), context);
        assert.equal(lastOf(sent, TOILET_QUEUED)?.to, 'H2');
        assert.equal(agent.queueLength, 1);
        assert.deepEqual(lastOf(sent, TOILET_QUEUED)?.payload, { id: 'H2', position: 1 });
    });

    it('через 20 игровых минут освобождает место и пускает следующего', () => {
        const agent = new ToiletAgent({ minutes: 20 });
        const { context, sent } = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), context);
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H2', replyTo: 'H2' }), context);

        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), context);
        assert.equal(agent.occupant, 'H1');
        assert.equal(lastOf(sent, TIME_REQUEST)?.to, DAY_AGENT_ID);

        agent.receive(createMessage(TIME_REPORT, { iso: gameTime(10, 0) }), context);
        agent.receive(createMessage(TIME_REPORT, { iso: gameTime(10, 10) }), context);
        assert.equal(agent.occupant, 'H1');

        agent.receive(createMessage(TIME_REPORT, { iso: gameTime(10, 20) }), context);
        assert.equal(agent.occupant, null);
        assert.equal(lastOf(sent, TOILET_RELEASED)?.to, 'H1');
        assert.equal(lastOf(sent, TOILET_GRANTED)?.to, 'H2');
        assert.equal(agent.queueLength, 0);
    });

    it('пока занят, по тику спрашивает время у часов мира', () => {
        const agent = new ToiletAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), context);
        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), context);
        const before = sent.length;

        agent.receive(createMessage(TICK), context);
        assert.equal(sent.length, before + 1);
        assert.equal(sent.at(-1)?.to, DAY_AGENT_ID);
        assert.equal(sent.at(-1)?.type, TIME_REQUEST);

        agent.receive(createMessage(TOILET_LEAVE, { id: 'H1' }), context);
        const afterLeave = sent.length;
        agent.receive(createMessage(TICK), context);
        assert.equal(sent.length, afterLeave);
    });

    it('leave освобождает место и уведомляет человека', () => {
        const agent = new ToiletAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), context);
        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), context);

        agent.receive(createMessage(TOILET_LEAVE, { id: 'H1' }), context);

        assert.equal(agent.occupant, null);
        assert.equal(lastOf(sent, TOILET_RELEASED)?.to, 'H1');
    });

    it('на запрос состояния отдаёт минуты, занявшего и очередь', () => {
        const agent = new ToiletAgent();
        const { context, sent } = createContext();

        agent.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.deepEqual((lastOf(sent, STATUS_REPORT)?.payload as { details?: unknown }).details, { minutes: 20, occupant: null, queue: 0 });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new ToiletAgent();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });

    it('проверяет настройки', () => {
        assert.throws(() => new ToiletAgent({ minutes: 0 }), /minutes должен быть положительным числом/);
        assert.throws(() => new ToiletAgent({ position: { x: 1 } }), /position/);
    });
});

