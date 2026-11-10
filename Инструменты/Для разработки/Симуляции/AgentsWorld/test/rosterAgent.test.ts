import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as roster from '../lib/rosterAgent.ts';
import { createMessage } from '../lib/protocol/message.ts';
import { STATUS_REQUEST, STATUS_REPORT } from '../lib/protocol/names.ts';
import type { ActorContext } from '../lib/actor.ts';

const { RosterAgent, ROSTER_SNAPSHOT, ROSTER_QUERY, ROSTER_REPORT, ROSTER_SUBSCRIBE, ROSTER_UPDATE } = roster;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = roster.ROSTER_AGENT_ID): Fixture {
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

const ivan = { id: 'HumanAgent-1', type: 'HumanAgent' };
const anna = { id: 'HumanAgent-2', type: 'HumanAgent' };
const clock = { id: 'DayAgent-1', type: 'DayAgent' };

type Entry = { readonly id: string; readonly type: string };

function snapshot(agents: ReadonlyArray<Entry>) {
    return createMessage(ROSTER_SNAPSHOT, { agents });
}

describe('RosterAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(roster.type, 'RosterAgent');
        assert.match(roster.moduleUrl, /lib\/rosterAgent\.ts$/);
        assert.equal(roster.ROSTER_AGENT_ID, 'RosterAgent-1');
        assert.equal(roster.createAgent(roster.ROSTER_AGENT_ID, {}).type, 'RosterAgent');
    });

    it('запоминает состав мира из снимка', () => {
        const agent = new RosterAgent();
        const { context, log } = createContext();

        agent.receive(snapshot([ivan, anna, clock]), context);

        assert.equal(agent.state().known, 3);
        assert.match(log[0] ?? '', /в реестре 3 агентов/);
    });

    it('ищет агентов по типу, а пустой список возвращает всех', () => {
        const agent = new RosterAgent();
        const { context } = createContext();
        agent.receive(snapshot([ivan, anna, clock]), context);

        assert.deepEqual(agent.idsOfTypes(['HumanAgent']), ['HumanAgent-1', 'HumanAgent-2']);
        assert.deepEqual(agent.idsOfTypes(['DayAgent']), ['DayAgent-1']);
        assert.deepEqual(agent.idsOfTypes(['НетТакого']), []);
        assert.deepEqual(agent.idsOfTypes([]), ['HumanAgent-1', 'HumanAgent-2', 'DayAgent-1']);
    });

    it('отвечает на запрос тому, кто спросил', () => {
        const agent = new RosterAgent();
        const { context, sent } = createContext();
        agent.receive(snapshot([ivan, anna, clock]), context);

        agent.receive(createMessage(ROSTER_QUERY, { types: ['HumanAgent'], replyTo: 'TickAgent-1' }), context);

        const answer = sent.at(-1);
        assert.equal(answer?.to, 'TickAgent-1');
        assert.equal(answer?.type, ROSTER_REPORT);
        assert.deepEqual(answer?.payload, { types: ['HumanAgent'], ids: ['HumanAgent-1', 'HumanAgent-2'] });
    });

    it('без обратного адреса отвечает только в лог', () => {
        const agent = new RosterAgent();
        const { context, log } = createContext();

        agent.receive(createMessage(ROSTER_QUERY, { types: ['HumanAgent'] }), context);

        assert.match(log.at(-1) ?? '', /без обратного адреса/);
    });

    it('подписка сразу отдаёт текущих подходящих агентов', () => {
        const agent = new RosterAgent();
        const { context, sent } = createContext();
        agent.receive(snapshot([ivan, clock]), context);

        agent.receive(createMessage(ROSTER_SUBSCRIBE, { types: ['HumanAgent'], replyTo: 'TickAgent-1' }), context);

        assert.equal(agent.state().subscribers, 1);
        const update = sent.at(-1);
        assert.equal(update?.to, 'TickAgent-1');
        assert.equal(update?.type, ROSTER_UPDATE);
        assert.deepEqual(update?.payload, { agents: [ivan] });
    });

    it('уведомляет подписчика о новых агентах нужного типа', () => {
        const agent = new RosterAgent();
        const { context, sent } = createContext();
        agent.receive(snapshot([ivan]), context);
        agent.receive(createMessage(ROSTER_SUBSCRIBE, { types: ['HumanAgent'], replyTo: 'TickAgent-1' }), context);
        const before = sent.length;

        agent.receive(snapshot([ivan, anna, clock]), context);

        const fresh = sent.slice(before);
        assert.equal(fresh.length, 1);
        assert.deepEqual(fresh[0]?.payload, { agents: [anna] });
    });

    it('не уведомляет повторно о том же агенте', () => {
        const agent = new RosterAgent();
        const { context, sent } = createContext();
        agent.receive(snapshot([ivan]), context);
        agent.receive(createMessage(ROSTER_SUBSCRIBE, { types: [], replyTo: 'TickAgent-1' }), context);
        const before = sent.length;

        agent.receive(snapshot([ivan]), context);

        assert.equal(sent.length, before);
    });

    it('подписка без обратного адреса не регистрируется', () => {
        const agent = new RosterAgent();
        const { context, log } = createContext();

        agent.receive(createMessage(ROSTER_SUBSCRIBE, { types: ['HumanAgent'] }), context);

        assert.equal(agent.state().subscribers, 0);
        assert.match(log.at(-1) ?? '', /без обратного адреса/);
    });

    it('отвергает битый снимок и битый запрос', () => {
        const agent = new RosterAgent();
        const { context } = createContext();

        assert.throws(() => agent.receive(createMessage(ROSTER_SNAPSHOT, { agents: [{ id: 'X' }] }), context), /нет типа/);
        assert.throws(() => agent.receive(createMessage(ROSTER_SNAPSHOT, {}), context), /нет массива agents/);
        assert.throws(() => agent.receive(createMessage(ROSTER_QUERY, { types: 'HumanAgent', replyTo: 'x' }), context), /types должен быть массивом/);
    });

    it('на запрос состояния отдаёт число агентов и подписчиков', () => {
        const agent = new RosterAgent();
        const { context, sent } = createContext();
        agent.receive(snapshot([ivan, clock]), context);
        agent.receive(createMessage(ROSTER_SUBSCRIBE, { types: [], replyTo: 'TickAgent-1' }), context);

        agent.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        const report = sent.at(-1);
        assert.equal(report?.type, STATUS_REPORT);
        assert.deepEqual((report?.payload as { details?: unknown } | undefined)?.details, { known: 2, subscribers: 1 });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new RosterAgent();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });
});
