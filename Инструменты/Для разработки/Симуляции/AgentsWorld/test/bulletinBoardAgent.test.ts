import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as bulletin from '../agents/bulletinBoardAgent.ts';
import { ROSTER_AGENT_ID, ROSTER_QUERY, ROSTER_REPORT } from '../lib/rosterAgent.ts';
import { createMessage, STATUS_REQUEST, STATUS_REPORT } from '../lib/protocol.ts';
import type { ActorContext } from '../lib/actor.ts';

const { BulletinBoardAgent, BULLETIN_BOARD_AGENT_ID, BULLETIN_FIND, BULLETIN_RESULT } = bulletin;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = BULLETIN_BOARD_AGENT_ID): Fixture {
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

describe('BulletinBoardAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(bulletin.type, 'BulletinBoardAgent');
        assert.match(bulletin.moduleUrl, /agents\/bulletinBoardAgent\.ts$/);
        assert.equal(BULLETIN_BOARD_AGENT_ID, 'BulletinBoardAgent-1');
        assert.equal(bulletin.createAgent(BULLETIN_BOARD_AGENT_ID, {}).type, 'BulletinBoardAgent');
    });

    it('ищет агентов нужного типа через реестр', () => {
        const agent = new BulletinBoardAgent();
        const { context, sent } = createContext();

        agent.receive(createMessage(BULLETIN_FIND, { type: 'BankAgent', replyTo: 'HumanAgent-1' }), context);

        assert.equal(agent.pendingCount, 1);
        assert.equal(lastOf(sent, ROSTER_QUERY)?.to, ROSTER_AGENT_ID);
        assert.deepEqual(lastOf(sent, ROSTER_QUERY)?.payload, { types: ['BankAgent'], replyTo: BULLETIN_BOARD_AGENT_ID });
    });

    it('отвечает спрашивающему списком адресов', () => {
        const agent = new BulletinBoardAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(BULLETIN_FIND, { type: 'BankAgent', replyTo: 'HumanAgent-1' }), context);

        agent.receive(createMessage(ROSTER_REPORT, { types: ['BankAgent'], ids: ['BankAgent-1', 'BankAgent-2'] }), context);

        assert.equal(agent.pendingCount, 0);
        assert.equal(lastOf(sent, BULLETIN_RESULT)?.to, 'HumanAgent-1');
        assert.deepEqual(lastOf(sent, BULLETIN_RESULT)?.payload, { type: 'BankAgent', ids: ['BankAgent-1', 'BankAgent-2'] });
    });

    it('без обратного адреса ничего не ищет', () => {
        const agent = new BulletinBoardAgent();
        const { context, log, sent } = createContext();

        agent.receive(createMessage(BULLETIN_FIND, { type: 'BankAgent' }), context);

        assert.equal(agent.pendingCount, 0);
        assert.equal(sent.length, 0);
        assert.match(log.at(-1) ?? '', /без обратного адреса/);
    });

    it('ответ без запроса просто пишет в лог', () => {
        const agent = new BulletinBoardAgent();
        const { context, log } = createContext();

        agent.receive(createMessage(ROSTER_REPORT, { types: ['BankAgent'], ids: [] }), context);

        assert.match(log.at(-1) ?? '', /а запроса не было/);
    });

    it('на запрос состояния отдаёт число ожиданий', () => {
        const agent = new BulletinBoardAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(BULLETIN_FIND, { type: 'BankAgent', replyTo: 'HumanAgent-1' }), context);

        agent.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.deepEqual((lastOf(sent, STATUS_REPORT)?.payload as { details?: unknown }).details, { waiting: 1 });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new BulletinBoardAgent();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });
});
