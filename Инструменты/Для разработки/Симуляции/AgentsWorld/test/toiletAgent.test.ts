import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as toilet from '../agents/toiletAgent.ts';
import { DAY_AGENT_ID, TIME_REQUEST, TIME_REPORT } from '../agents/dayAgent.ts';
import { PHYSICS_AGENT_ID, PHYSICS_BODY, PHYSICS_POSITION, PHYSICS_REGISTER } from '../agents/physicsAgent.ts';
import { createMessage } from '../lib/protocol/message.ts';
import { TICK, STATUS_REQUEST, STATUS_REPORT } from '../lib/protocol/names.ts';
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

function answerPositions(
    agent: toilet.ToiletAgent,
    fixture: Fixture,
    positions: Record<string, { readonly x: number; readonly y: number } | null>,
): void {
    const queries = fixture.sent.filter((item) => item.type === PHYSICS_POSITION);
    for (const query of queries) {
        const { id } = query.payload as { id: string };
        const point = positions[id] ?? null;
        const body = point === null ? null : { id, position: { x: point.x, y: point.y, z: 0 } };
        agent.receive(createMessage(PHYSICS_BODY, { id, body }), fixture.context);
    }
}

function grantsTo(sent: Fixture['sent'], id: string): number {
    return sent.filter((item) => item.type === TOILET_GRANTED && item.to === id).length;
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

    it('без настройки встаёт в начало плоскости, а не на высоту', () => {
        const agent = new ToiletAgent();
        const { context, sent } = createContext();

        agent.start(context);

        assert.deepEqual(lastOf(sent, PHYSICS_REGISTER)?.payload, { id: TOILET_AGENT_ID, position: { x: 0, y: 0, z: 0 } });
    });

    it('пускает желающего, когда узнаёт его позицию', () => {
        const agent = new ToiletAgent({ position: { x: 0, y: 50, z: 0 } });
        const fixture = createContext();

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);

        assert.equal(lastOf(fixture.sent, TOILET_QUEUED)?.to, 'H1');
        assert.deepEqual(lastOf(fixture.sent, TOILET_QUEUED)?.payload, { id: 'H1', position: 1 });
        assert.equal(lastOf(fixture.sent, PHYSICS_POSITION)?.to, PHYSICS_AGENT_ID);
        assert.deepEqual(lastOf(fixture.sent, PHYSICS_POSITION)?.payload, { id: 'H1', replyTo: TOILET_AGENT_ID });
        assert.equal(lastOf(fixture.sent, TOILET_GRANTED), undefined);

        answerPositions(agent, fixture, { H1: { x: 0, y: 0 } });

        assert.equal(lastOf(fixture.sent, TOILET_GRANTED)?.to, 'H1');
        assert.equal(agent.state().queueLength, 0);
    });

    it('место достаётся тому, кто ближе к туалету', () => {
        const agent = new ToiletAgent({ position: { x: 0, y: 50, z: 0 } });
        const fixture = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H1: { x: 0, y: 0 } });
        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), fixture.context);

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H2', replyTo: 'H2' }), fixture.context);
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H3', replyTo: 'H3' }), fixture.context);
        assert.equal(lastOf(fixture.sent, TOILET_GRANTED)?.to, 'H1');

        agent.receive(createMessage(TOILET_LEAVE, { id: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H2: { x: 0, y: 10 }, H3: { x: 0, y: 45 } });

        assert.equal(lastOf(fixture.sent, TOILET_GRANTED)?.to, 'H3');
        assert.equal(agent.state().queueLength, 1);
        assert.match(fixture.log.at(-1) ?? '', /H3 ближе всех/);
    });

    it('не выбирает того, кто только что вышел, пока место не получит другой', () => {
        const agent = new ToiletAgent({ position: { x: 0, y: 50, z: 0 } });
        const fixture = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H1: { x: 0, y: 0 } });
        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), fixture.context);
        agent.receive(createMessage(TOILET_LEAVE, { id: 'H1' }), fixture.context);

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        assert.equal(grantsTo(fixture.sent, 'H1'), 1, 'вышедшего сразу не пускают обратно');
        assert.equal(agent.state().queueLength, 1);

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H2', replyTo: 'H2' }), fixture.context);
        answerPositions(agent, fixture, { H2: { x: 0, y: 40 } });
        assert.equal(grantsTo(fixture.sent, 'H2'), 1, 'место получает другой');

        agent.receive(createMessage(TOILET_ENTER, { id: 'H2' }), fixture.context);
        agent.receive(createMessage(TOILET_LEAVE, { id: 'H2' }), fixture.context);
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H1: { x: 0, y: 0 } });

        assert.equal(grantsTo(fixture.sent, 'H1'), 2, 'после другого H1 снова может');
    });

    it('не отдаёт место, если желающих нет в пространстве', () => {
        const agent = new ToiletAgent();
        const fixture = createContext();

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H1: null });

        assert.equal(lastOf(fixture.sent, TOILET_GRANTED), undefined);
        assert.equal(agent.state().queueLength, 1);
        assert.match(fixture.log.at(-1) ?? '', /не нашлось в пространстве/);
    });

    it('через 20 игровых минут освобождает место и пускает следующего', () => {
        const agent = new ToiletAgent({ minutes: 20 });
        const fixture = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H1: { x: 0, y: 0 } });
        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), fixture.context);
        assert.equal(agent.state().occupant, 'H1');
        assert.equal(lastOf(fixture.sent, TIME_REQUEST)?.to, DAY_AGENT_ID);

        agent.receive(createMessage(TOILET_REQUEST, { id: 'H2', replyTo: 'H2' }), fixture.context);

        agent.receive(createMessage(TIME_REPORT, { iso: gameTime(10, 0) }), fixture.context);
        agent.receive(createMessage(TIME_REPORT, { iso: gameTime(10, 10) }), fixture.context);
        assert.equal(agent.state().occupant, 'H1');

        agent.receive(createMessage(TIME_REPORT, { iso: gameTime(10, 20) }), fixture.context);
        assert.equal(agent.state().occupant, null);
        assert.equal(lastOf(fixture.sent, TOILET_RELEASED)?.to, 'H1');

        answerPositions(agent, fixture, { H2: { x: 0, y: 10 } });
        assert.equal(lastOf(fixture.sent, TOILET_GRANTED)?.to, 'H2');
        assert.equal(agent.state().queueLength, 0);
    });

    it('пока занят, по тику спрашивает время у часов мира', () => {
        const agent = new ToiletAgent();
        const fixture = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H1: { x: 0, y: 0 } });
        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), fixture.context);
        const before = fixture.sent.length;

        agent.receive(createMessage(TICK), fixture.context);
        assert.equal(fixture.sent.length, before + 1);
        assert.equal(fixture.sent.at(-1)?.to, DAY_AGENT_ID);
        assert.equal(fixture.sent.at(-1)?.type, TIME_REQUEST);

        agent.receive(createMessage(TOILET_LEAVE, { id: 'H1' }), fixture.context);
        const afterLeave = fixture.sent.length;
        agent.receive(createMessage(TICK), fixture.context);
        assert.equal(fixture.sent.length, afterLeave);
    });

    it('leave освобождает место и уведомляет человека', () => {
        const agent = new ToiletAgent();
        const fixture = createContext();
        agent.receive(createMessage(TOILET_REQUEST, { id: 'H1', replyTo: 'H1' }), fixture.context);
        answerPositions(agent, fixture, { H1: { x: 0, y: 0 } });
        agent.receive(createMessage(TOILET_ENTER, { id: 'H1' }), fixture.context);

        agent.receive(createMessage(TOILET_LEAVE, { id: 'H1' }), fixture.context);

        assert.equal(agent.state().occupant, null);
        assert.equal(lastOf(fixture.sent, TOILET_RELEASED)?.to, 'H1');
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

