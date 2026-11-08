import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, STATUS_REQUEST, STATUS_REPORT, type Message } from '../lib/protocol.ts';

/** Актор, который записывает всё, что до него дошло. */
class Recorder extends AbstractActor {
    readonly type = 'Recorder';
    readonly seen: string[] = [];

    protected override handle(message: Message, context: ActorContext): void {
        this.seen.push(`${context.id}:${message.type}`);
    }

    /** Открывает доступ к `describe` для проверки состояния. */
    details(): Readonly<Record<string, unknown>> {
        return this.describe();
    }
}

/** Актор с собственным описанием состояния. */
class Talkative extends Recorder {
    protected override describe(): Readonly<Record<string, unknown>> {
        return { mood: 'бодрый' };
    }
}

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id: string): Fixture {
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

describe('actor', () => {
    it('AbstractActor передаёт сообщение в handle вместе с контекстом', async () => {
        const actor = new Recorder();

        await actor.receive(createMessage('раз'), createContext('rec-1').context);
        await actor.receive(createMessage('два'), createContext('rec-1').context);

        assert.deepEqual(actor.seen, ['rec-1:раз', 'rec-1:два']);
    });

    it('контекст даёт актору его id и канал лога', () => {
        const { context, log } = createContext('rec-7');

        context.log('привет');

        assert.equal(context.id, 'rec-7');
        assert.deepEqual(log, ['привет']);
    });

    it('отвечает на запрос состояния, не доходя до handle', async () => {
        const actor = new Recorder();
        const { context, sent } = createContext('rec-1');

        await actor.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.deepEqual(actor.seen, [], 'handle вызываться не должен');
        assert.deepEqual(sent, [{ to: 'мир', type: STATUS_REPORT, payload: { id: 'rec-1', type: 'Recorder', details: {} } }]);
    });

    it('отдаёт в ответе состояние, которое описал наследник', async () => {
        const actor = new Talkative();
        const { context, sent } = createContext('talk-1');

        await actor.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.deepEqual(sent[0]?.payload, { id: 'talk-1', type: 'Recorder', details: { mood: 'бодрый' } });
        assert.deepEqual(actor.details(), { mood: 'бодрый' });
    });

    it('не отвечает на запрос состояния без обратного адреса', async () => {
        const actor = new Recorder();
        const { context, sent } = createContext('rec-1');

        await actor.receive(createMessage(STATUS_REQUEST, {}), context);

        assert.deepEqual(sent, []);
    });
});
