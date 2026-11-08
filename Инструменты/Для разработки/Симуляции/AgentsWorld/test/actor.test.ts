import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AbstractActor, type ActorContext } from '../src/actor.ts';
import { createMessage, type Message } from '../src/protocol.ts';

/** Актор, который записывает всё, что до него дошло. */
class Recorder extends AbstractActor {
    readonly type = 'Recorder';
    readonly seen: string[] = [];

    protected override handle(message: Message, context: ActorContext): void {
        this.seen.push(`${context.id}:${message.type}`);
    }
}

function createContext(id: string, log: string[]): ActorContext {
    return {
        id,
        send: (): void => {},
        log: (text: string): void => {
            log.push(text);
        },
    };
}

describe('actor', () => {
    it('AbstractActor передаёт сообщение в handle вместе с контекстом', async () => {
        const log: string[] = [];
        const actor = new Recorder();

        await actor.receive(createMessage('раз'), createContext('rec-1', log));
        await actor.receive(createMessage('два'), createContext('rec-1', log));

        assert.deepEqual(actor.seen, ['rec-1:раз', 'rec-1:два']);
    });

    it('контекст даёт актору его id и канал лога', () => {
        const log: string[] = [];
        const context = createContext('rec-7', log);

        context.log('привет');

        assert.equal(context.id, 'rec-7');
        assert.deepEqual(log, ['привет']);
    });
});
