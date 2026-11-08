import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as tickAgent from '../agents/tickAgent.ts';
import { createMessage, TICK } from '../lib/protocol.ts';
import type { ActorContext } from '../lib/actor.ts';

const { TickAgent, TICK_AGENT_ID } = tickAgent;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: string[];
}

function createContext(): Fixture {
    const log: string[] = [];
    const sent: string[] = [];
    const context: ActorContext = {
        id: TICK_AGENT_ID,
        send: (to): void => {
            sent.push(to);
        },
        log: (text): void => {
            log.push(text);
        },
    };
    return { context, log, sent };
}

/** Ждёт выполнения условия: тикер работает по таймеру. */
async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error('не дождались условия за отведённое время');
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

describe('TickAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(tickAgent.type, 'TickAgent');
        assert.match(tickAgent.moduleUrl, /agents\/tickAgent\.ts$/);
        assert.equal(TICK_AGENT_ID, 'TickAgent-1');
        assert.equal(tickAgent.createAgent(TICK_AGENT_ID, {}).type, 'TickAgent');
    });

    it('по умолчанию будит раз в секунду', () => {
        const agent = new TickAgent();

        assert.equal(agent.intervalMs, 1000);
        assert.equal(agent.recipientCount, 0);
    });

    it('рассылает tick всем адресатам по таймеру', async () => {
        const agent = new TickAgent({ intervalMs: 10, recipients: ['HumanAgent-1', 'HumanAgent-2'] });
        const { context, sent } = createContext();

        agent.start(context);
        await waitFor(() => sent.length >= 4);
        agent.stop();

        assert.deepEqual(sent.slice(0, 4), ['HumanAgent-1', 'HumanAgent-2', 'HumanAgent-1', 'HumanAgent-2']);
    });

    it('после остановки импульсов не отправляет', async () => {
        const agent = new TickAgent({ intervalMs: 10, recipients: ['HumanAgent-1'] });
        const { context, sent } = createContext();

        agent.start(context);
        await waitFor(() => sent.length >= 2);
        agent.stop();
        const afterStop = sent.length;
        await new Promise((resolve) => setTimeout(resolve, 60));

        assert.equal(sent.length, afterStop);
    });

    it('без адресатов не запускает таймер и объясняет это в логе', async () => {
        const agent = new TickAgent({ intervalMs: 10 });
        const { context, log, sent } = createContext();

        agent.start(context);
        await new Promise((resolve) => setTimeout(resolve, 40));
        agent.stop();

        assert.equal(sent.length, 0);
        assert.match(log[0] ?? '', /некого будить/);
    });

    it('передаёт импульс именно типом tick', async () => {
        const agent = new TickAgent({ intervalMs: 10, recipients: ['HumanAgent-1'] });
        const types: string[] = [];
        const context: ActorContext = {
            id: TICK_AGENT_ID,
            send: (_to, message): void => {
                types.push(message.type);
            },
            log: (): void => {},
        };

        agent.start(context);
        await waitFor(() => types.length >= 1);
        agent.stop();

        assert.deepEqual([...new Set(types)], [TICK]);
    });

    it('сообщает в дашборд частоту и число адресатов', () => {
        const agent = new TickAgent({ intervalMs: 250, recipients: ['a', 'b', 'c'] });

        assert.deepEqual(agent.describeForDashboard(), { intervalMs: 250, recipients: 3 });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new TickAgent({ recipients: [] });
        const { context, log } = createContext();

        agent.receive(createMessage('привет'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «привет»/);
    });

    it('проверяет настройки', () => {
        assert.throws(() => new TickAgent({ intervalMs: 0 }), /intervalMs должен быть целым положительным/);
        assert.throws(() => new TickAgent({ intervalMs: 1.5 }), /intervalMs должен быть целым положительным/);
        assert.throws(() => new TickAgent({ intervalMs: '100' }), /intervalMs должен быть целым положительным/);
        assert.throws(() => new TickAgent({ recipients: 'HumanAgent-1' }), /recipients должен быть массивом/);
        assert.throws(() => new TickAgent({ recipients: [''] }), /каждый адресат в recipients/);
    });
});
