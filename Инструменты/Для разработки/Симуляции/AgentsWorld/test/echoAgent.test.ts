import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ECHO_AGENT_TYPE, EchoAgent } from '../agents/echoAgent.ts';
import type { ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

interface ContextFixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; message: Message }>;
}

function createContext(): ContextFixture {
    const log: string[] = [];
    const sent: Array<{ to: string; message: Message }> = [];
    const context: ActorContext = {
        id: 'EchoAgent-1',
        send: (to, message): void => {
            sent.push({ to, message });
        },
        log: (text): void => {
            log.push(text);
        },
    };
    return { context, log, sent };
}

describe('EchoAgent', () => {
    it('регистрируется под своим типом', () => {
        assert.equal(new EchoAgent().type, ECHO_AGENT_TYPE);
        assert.equal(ECHO_AGENT_TYPE, 'EchoAgent');
    });

    it('при старте пишет приветствие и отправляет себе сообщения', () => {
        const { context, log, sent } = createContext();
        const agent = new EchoAgent({ greetings: 2 });

        agent.start(context);

        assert.equal(log.length, 1);
        assert.match(log[0] ?? '', /привет, я EchoAgent-1/);
        assert.deepEqual(
            sent.map((item) => item.to),
            ['EchoAgent-1', 'EchoAgent-1'],
        );
        assert.equal(sent[0]?.message.type, 'echo');
    });

    it('печатает текст входящего сообщения echo', async () => {
        const { context, log } = createContext();
        const agent = new EchoAgent({ greetings: 0 });

        await agent.receive(createMessage('echo', { text: 'проверка связи' }), context);

        assert.deepEqual(log, ['эхо: проверка связи']);
    });

    it('не падает на сообщении без текста и на чужом типе', async () => {
        const { context, log } = createContext();
        const agent = new EchoAgent();

        await agent.receive(createMessage('echo'), context);
        await agent.receive(createMessage('чужое'), context);

        assert.deepEqual(log, ['эхо: (без текста)', 'не знаю, что делать с сообщением «чужое»']);
    });

    it('по умолчанию отправляет два сообщения и проверяет настройку', () => {
        const { context, sent } = createContext();

        new EchoAgent({}).start(context);

        assert.equal(sent.length, 2);
        assert.throws(() => new EchoAgent({ greetings: -1 }), /greetings/);
        assert.throws(() => new EchoAgent({ greetings: 'два' }), /greetings/);
    });
});
