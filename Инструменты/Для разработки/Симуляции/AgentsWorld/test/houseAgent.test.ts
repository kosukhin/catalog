import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as house from '../agents/houseAgent.ts';
import { BANK_AGENT_ID, BANK_CHARGE, BANK_PAYMENT } from '../agents/bankAgent.ts';
import { PHYSICS_AGENT_ID, PHYSICS_POSITION, PHYSICS_BODY } from '../agents/physicsAgent.ts';
import { createMessage } from '../lib/protocol/message.ts';
import { STATUS_REQUEST, STATUS_REPORT } from '../lib/protocol/names.ts';
import type { ActorContext } from '../lib/actor.ts';

const { HouseAgent, HOUSE_AGENT_ID, HOUSE_BUY, HOUSE_REPORT } = house;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = HOUSE_AGENT_ID): Fixture {
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

describe('HouseAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(house.type, 'HouseAgent');
        assert.match(house.moduleUrl, /agents\/houseAgent\.ts$/);
        assert.equal(HOUSE_AGENT_ID, 'HouseAgent-1');
        assert.equal(house.createAgent(HOUSE_AGENT_ID, {}).type, 'HouseAgent');
    });

    it('на покупку просит банк списать 800', () => {
        const agent = new HouseAgent();
        const { context, sent } = createContext();

        agent.receive(createMessage(HOUSE_BUY, { owner: 'HumanAgent-1', replyTo: 'HumanAgent-1' }), context);

        assert.equal(lastOf(sent, BANK_CHARGE)?.to, BANK_AGENT_ID);
        assert.deepEqual(lastOf(sent, BANK_CHARGE)?.payload, { owner: 'HumanAgent-1', amount: 800, replyTo: HOUSE_AGENT_ID });
    });

    it('после оплаты берёт точку человека и ставит дом', () => {
        const agent = new HouseAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(HOUSE_BUY, { owner: 'A', replyTo: 'A' }), context);

        agent.receive(createMessage(BANK_PAYMENT, { owner: 'A', amount: 800, accepted: true, balance: 200, reason: null }), context);
        assert.equal(lastOf(sent, PHYSICS_POSITION)?.to, PHYSICS_AGENT_ID);
        assert.deepEqual(lastOf(sent, PHYSICS_POSITION)?.payload, { id: 'A', replyTo: HOUSE_AGENT_ID });

        agent.receive(createMessage(PHYSICS_BODY, { id: 'A', body: { id: 'A', position: { x: 5, y: 0, z: 0 } } }), context);

        assert.equal(agent.state().houses, 1);
        assert.deepEqual(agent.state().houseOf('A')?.position, { x: 5, y: 0, z: 0 });
        assert.equal(lastOf(sent, HOUSE_REPORT)?.to, 'A');
        assert.equal((lastOf(sent, HOUSE_REPORT)?.payload as { accepted: boolean }).accepted, true);
        assert.equal((lastOf(sent, HOUSE_REPORT)?.payload as { houseId: string }).houseId, 'House-A');
    });

    it('отказывает, если банк не списал', () => {
        const agent = new HouseAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(HOUSE_BUY, { owner: 'A', replyTo: 'A' }), context);

        agent.receive(createMessage(BANK_PAYMENT, { owner: 'A', accepted: false, reason: 'недостаточно средств' }), context);

        assert.equal(agent.state().houses, 0);
        assert.equal((lastOf(sent, HOUSE_REPORT)?.payload as { accepted: boolean }).accepted, false);
        assert.match((lastOf(sent, HOUSE_REPORT)?.payload as { reason: string }).reason, /недостаточно средств/);
    });

    it('отказывает, если у человека нет точки в пространстве', () => {
        const agent = new HouseAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(HOUSE_BUY, { owner: 'A', replyTo: 'A' }), context);
        agent.receive(createMessage(BANK_PAYMENT, { owner: 'A', accepted: true }), context);

        agent.receive(createMessage(PHYSICS_BODY, { id: 'A', body: null }), context);

        assert.equal(agent.state().houses, 0);
        assert.match((lastOf(sent, HOUSE_REPORT)?.payload as { reason: string }).reason, /нет точки/);
    });

    it('повторная покупка не создаёт второй дом', () => {
        const agent = new HouseAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(HOUSE_BUY, { owner: 'A', replyTo: 'A' }), context);
        agent.receive(createMessage(BANK_PAYMENT, { owner: 'A', accepted: true }), context);
        agent.receive(createMessage(PHYSICS_BODY, { id: 'A', body: { id: 'A', position: { x: 1, y: 0, z: 0 } } }), context);

        agent.receive(createMessage(HOUSE_BUY, { owner: 'A', replyTo: 'A' }), context);

        assert.equal(agent.state().houses, 1);
        assert.match((lastOf(sent, HOUSE_REPORT)?.payload as { reason: string }).reason, /уже куплен/);
    });

    it('на запрос состояния отдаёт цену и число домов', () => {
        const agent = new HouseAgent({ price: 900 });
        const { context, sent } = createContext();

        agent.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.deepEqual((lastOf(sent, STATUS_REPORT)?.payload as { details?: unknown }).details, { price: 900, houses: 0 });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new HouseAgent();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });

    it('проверяет настройки', () => {
        assert.throws(() => new HouseAgent({ price: 0 }), /price должен быть положительным числом/);
    });
});

