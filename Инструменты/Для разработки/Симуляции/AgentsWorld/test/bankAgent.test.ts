import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as bank from '../agents/bankAgent.ts';
import { createMessage } from '../lib/protocol/message.ts';
import { STATUS_REQUEST, STATUS_REPORT } from '../lib/protocol/names.ts';
import type { ActorContext } from '../lib/actor.ts';

const { BankAgent, BANK_AGENT_ID, BANK_OPEN, BANK_ACCOUNT, BANK_CHARGE, BANK_PAYMENT } = bank;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = BANK_AGENT_ID): Fixture {
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

describe('BankAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(bank.type, 'BankAgent');
        assert.match(bank.moduleUrl, /agents\/bankAgent\.ts$/);
        assert.equal(BANK_AGENT_ID, 'BankAgent-1');
        assert.equal(bank.createAgent(BANK_AGENT_ID, {}).type, 'BankAgent');
    });

    it('открывает счёт с депозитом 1000', () => {
        const agent = new BankAgent();
        const { context, sent } = createContext();

        agent.receive(createMessage(BANK_OPEN, { owner: 'HumanAgent-1', replyTo: 'HumanAgent-1' }), context);

        assert.equal(agent.state().balanceOf('HumanAgent-1'), 1000);
        assert.equal(lastOf(sent, BANK_ACCOUNT)?.to, 'HumanAgent-1');
        assert.deepEqual(lastOf(sent, BANK_ACCOUNT)?.payload, { owner: 'HumanAgent-1', balance: 1000 });
    });

    it('повторное открытие не сбрасывает баланс', () => {
        const agent = new BankAgent();
        const { context } = createContext();
        agent.receive(createMessage(BANK_OPEN, { owner: 'A', replyTo: 'A' }), context);
        agent.receive(createMessage(BANK_CHARGE, { owner: 'A', amount: 400, replyTo: 'A' }), context);

        agent.receive(createMessage(BANK_OPEN, { owner: 'A', replyTo: 'A' }), context);

        assert.equal(agent.state().balanceOf('A'), 600);
    });

    it('списывает деньги при достаточном балансе', () => {
        const agent = new BankAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(BANK_OPEN, { owner: 'A', replyTo: 'A' }), context);

        agent.receive(createMessage(BANK_CHARGE, { owner: 'A', amount: 800, replyTo: 'HouseAgent-1' }), context);

        assert.equal(agent.state().balanceOf('A'), 200);
        assert.equal(lastOf(sent, BANK_PAYMENT)?.to, 'HouseAgent-1');
        assert.deepEqual(lastOf(sent, BANK_PAYMENT)?.payload, { owner: 'A', amount: 800, accepted: true, balance: 200, reason: null });
    });

    it('отказывает при нехватке денег и без счёта', () => {
        const agent = new BankAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(BANK_OPEN, { owner: 'A', replyTo: 'A' }), context);

        agent.receive(createMessage(BANK_CHARGE, { owner: 'A', amount: 5000, replyTo: 'A' }), context);
        assert.equal((lastOf(sent, BANK_PAYMENT)?.payload as { accepted: boolean }).accepted, false);
        assert.equal(agent.state().balanceOf('A'), 1000);

        agent.receive(createMessage(BANK_CHARGE, { owner: 'нет', amount: 1, replyTo: 'A' }), context);
        assert.match((lastOf(sent, BANK_PAYMENT)?.payload as { reason: string }).reason, /нет счёта/);
    });

    it('на запрос состояния отдаёт депозит и число счетов', () => {
        const agent = new BankAgent();
        const { context, sent } = createContext();
        agent.receive(createMessage(BANK_OPEN, { owner: 'A', replyTo: 'A' }), context);

        agent.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.equal(lastOf(sent, STATUS_REPORT)?.payload instanceof Object, true);
        assert.deepEqual((lastOf(sent, STATUS_REPORT)?.payload as { details?: unknown }).details, { deposit: 1000, accounts: 1 });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new BankAgent();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });

    it('проверяет настройки', () => {
        assert.throws(() => new BankAgent({ deposit: 0 }), /deposit должен быть положительным числом/);
        assert.throws(() => new BankAgent({ deposit: 'много' }), /deposit должен быть положительным числом/);
    });
});
