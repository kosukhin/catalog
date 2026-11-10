import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as tickAgent from '../agents/tickAgent.ts';
import { createMessage } from '../lib/protocol/message.ts';
import { STATUS_REQUEST, TICK } from '../lib/protocol/names.ts';
import { ROSTER_AGENT_ID, ROSTER_QUERY, ROSTER_REPORT, ROSTER_SUBSCRIBE, ROSTER_UPDATE } from '../lib/rosterAgent.ts';
import type { ActorContext } from '../lib/actor.ts';

const { TickAgent, TICK_AGENT_ID } = tickAgent;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(): Fixture {
    const log: string[] = [];
    const sent: Array<{ to: string; type: string; payload: unknown }> = [];
    const context: ActorContext = {
        id: TICK_AGENT_ID,
        send: (to, message): void => {
            sent.push({ to, type: message.type, payload: message.payload });
        },
        log: (text): void => {
            log.push(text);
        },
    };
    return { context, log, sent };
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error('не дождались условия за отведённое время');
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

const ticksTo = (sent: Fixture['sent'], to: string): number =>
    sent.filter((item) => item.to === to && item.type === TICK).length;

describe('TickAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(tickAgent.type, 'TickAgent');
        assert.match(tickAgent.moduleUrl, /agents\/tickAgent\.ts$/);
        assert.equal(TICK_AGENT_ID, 'TickAgent-1');
        assert.equal(tickAgent.createAgent(TICK_AGENT_ID, { types: ['HumanAgent'] }).type, 'TickAgent');
    });

    it('по умолчанию будит раз в секунду и не знает получателей заранее', () => {
        const agent = new TickAgent({ types: ['HumanAgent'] });

        assert.equal(agent.state().intervalMs, 1000);
        assert.deepEqual(agent.state().types, ['HumanAgent']);
        assert.equal(agent.state().recipients, 0);
    });

    it('при старте спрашивает реестр по типам и подписывается на новых агентов', () => {
        const agent = new TickAgent({ types: ['HumanAgent'] });
        const { context, sent } = createContext();

        agent.start(context);
        agent.stop();

        assert.deepEqual(sent.map((item) => `${item.to}:${item.type}`), [
            `${ROSTER_AGENT_ID}:${ROSTER_QUERY}`,
            `${ROSTER_AGENT_ID}:${ROSTER_SUBSCRIBE}`,
        ]);
        assert.deepEqual(sent[0]?.payload, { types: ['HumanAgent'], replyTo: TICK_AGENT_ID });
        assert.deepEqual(sent[1]?.payload, { types: ['HumanAgent'], replyTo: TICK_AGENT_ID });
    });

    it('бьёт тиками только тех, кого дал реестр', async () => {
        const agent = new TickAgent({ intervalMs: 10, types: ['HumanAgent'] });
        const { context, sent } = createContext();

        agent.start(context);
        agent.receive(createMessage(ROSTER_REPORT, { types: ['HumanAgent'], ids: ['HumanAgent-1', 'HumanAgent-2'] }), context);
        await waitFor(() => ticksTo(sent, 'HumanAgent-1') >= 2 && ticksTo(sent, 'HumanAgent-2') >= 2);
        agent.stop();

        assert.equal(agent.state().recipients, 2);
        assert.ok(sent.every((item) => item.type !== TICK || item.to.startsWith('HumanAgent-')));
    });

    it('добавляет новых агентов из уведомления и пропускает чужие типы', async () => {
        const agent = new TickAgent({ intervalMs: 10, types: ['HumanAgent'] });
        const { context, sent } = createContext();

        agent.start(context);
        agent.receive(createMessage(ROSTER_REPORT, { types: ['HumanAgent'], ids: ['HumanAgent-1'] }), context);
        agent.receive(
            createMessage(ROSTER_UPDATE, {
                agents: [
                    { id: 'HumanAgent-2', type: 'HumanAgent' },
                    { id: 'DayAgent-1', type: 'DayAgent' },
                ],
            }),
            context,
        );
        await waitFor(() => ticksTo(sent, 'HumanAgent-2') >= 1);
        agent.stop();

        assert.equal(agent.state().recipients, 2);
        assert.equal(ticksTo(sent, 'DayAgent-1'), 0);
    });

    it('не дублирует агента, если он пришёл дважды', () => {
        const agent = new TickAgent({ types: ['HumanAgent'] });
        const { context } = createContext();

        agent.receive(createMessage(ROSTER_REPORT, { types: ['HumanAgent'], ids: ['HumanAgent-1'] }), context);
        agent.receive(createMessage(ROSTER_UPDATE, { agents: [{ id: 'HumanAgent-1', type: 'HumanAgent' }] }), context);

        assert.equal(agent.state().recipients, 1);
    });

    it('после остановки импульсов не отправляет', async () => {
        const agent = new TickAgent({ intervalMs: 10, types: ['HumanAgent'] });
        const { context, sent } = createContext();

        agent.start(context);
        agent.receive(createMessage(ROSTER_REPORT, { types: ['HumanAgent'], ids: ['HumanAgent-1'] }), context);
        await waitFor(() => ticksTo(sent, 'HumanAgent-1') >= 1);
        agent.stop();
        const afterStop = sent.length;
        await new Promise((resolve) => setTimeout(resolve, 60));

        assert.equal(sent.length, afterStop);
    });

    it('сообщает в дашборд частоту, типы и число получателей', () => {
        const agent = new TickAgent({ intervalMs: 250, types: ['HumanAgent', 'DayAgent'] });
        const { context, sent } = createContext();

        agent.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.deepEqual((sent.at(-1)?.payload as { details?: unknown } | undefined)?.details, {
            intervalMs: 250,
            types: ['HumanAgent', 'DayAgent'],
            recipients: 0,
        });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new TickAgent({ types: ['HumanAgent'] });
        const { context, log } = createContext();

        agent.receive(createMessage('привет'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «привет»/);
    });

    it('проверяет настройки', () => {
        assert.throws(() => new TickAgent({ intervalMs: 0, types: ['HumanAgent'] }), /intervalMs должен быть целым положительным/);
        assert.throws(() => new TickAgent({ intervalMs: 1.5, types: ['HumanAgent'] }), /intervalMs должен быть целым положительным/);
        assert.throws(() => new TickAgent({}), /types должен быть массивом/);
        assert.throws(() => new TickAgent({ types: [] }), /types должен содержать/);
        assert.throws(() => new TickAgent({ types: [''] }), /каждый тип в types/);
        assert.throws(() => new TickAgent({ rosterId: '', types: ['HumanAgent'] }), /rosterId должен быть непустой строкой/);
    });
});

