import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ActorRuntime, type ActorPorts } from '../lib/actorRuntime.ts';
import { AbstractActor } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol/message.ts';

class Collector extends AbstractActor {
    readonly received: string[] = [];

    constructor() {
        super('Collector');
    }
    started = 0;
    stopped = 0;
    failOn: string | null = null;

    start(): void {
        this.started += 1;
    }

    stop(): void {
        this.stopped += 1;
    }

    protected override handle(message: Message): void {
        if (this.failOn === message.type) {
            throw new Error('сломалось');
        }
        this.received.push(message.type);
    }
}

interface PortsFixture {
    readonly ports: ActorPorts;
    readonly sent: Array<{ to: string; type: string }>;
    readonly errors: string[];
}

function createPorts(): PortsFixture {
    const sent: Array<{ to: string; type: string }> = [];
    const errors: string[] = [];
    const ports: ActorPorts = {
        send: (to, message): void => {
            sent.push({ to, type: message.type });
        },
        log: (): void => {},
        onError: (actorId, error): void => {
            errors.push(`${actorId}:${error instanceof Error ? error.message : String(error)}`);
        },
    };
    return { ports, sent, errors };
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

describe('ActorRuntime', () => {
    it('обрабатывает сообщения по порядку и зовёт start/stop', async () => {
        const actor = new Collector();
        const runtime = new ActorRuntime({ id: 'c-1', actor, ports: createPorts().ports });

        await runtime.start();
        runtime.deliver('a', createMessage('первое'));
        runtime.deliver('b', createMessage('второе'));
        await waitFor(() => actor.received.length === 2);

        assert.deepEqual(actor.received, ['первое', 'второе']);
        assert.equal(actor.started, 1);

        await runtime.stop();
        assert.equal(actor.stopped, 1);
        assert.equal(runtime.state().pending, 0);
    });

    it('сообщения и лог уходят через ports, а не напрямую', async () => {
        const actor = new Collector();
        const fixture = createPorts();
        const runtime = new ActorRuntime({ id: 'c-2', actor, ports: fixture.ports });

        runtime.state().context.send('c-3', createMessage('в другой ящик'));

        assert.deepEqual(fixture.sent, [{ to: 'c-3', type: 'в другой ящик' }]);
        assert.equal(runtime.state().context.id, 'c-2');
    });

    it('ошибка обработчика не останавливает цикл', async () => {
        const actor = new Collector();
        const fixture = createPorts();
        const runtime = new ActorRuntime({ id: 'c-3', actor, ports: fixture.ports });
        actor.failOn = 'плохое';

        await runtime.start();
        runtime.deliver('a', createMessage('плохое'));
        runtime.deliver('a', createMessage('хорошее'));
        await waitFor(() => actor.received.length === 1);

        assert.deepEqual(actor.received, ['хорошее']);
        assert.deepEqual(fixture.errors, ['c-3:сломалось']);
        await runtime.stop();
    });

    it('после остановки сообщения не принимаются', async () => {
        const actor = new Collector();
        const runtime = new ActorRuntime({ id: 'c-4', actor, ports: createPorts().ports });

        await runtime.start();
        await runtime.stop();

        assert.equal(runtime.deliver('a', createMessage('поздно')), false);
    });

    it('stop дообрабатывает накопленные сообщения', async () => {
        const actor = new Collector();
        const runtime = new ActorRuntime({ id: 'c-5', actor, ports: createPorts().ports });
        await runtime.start();
        runtime.deliver('a', createMessage('в очереди'));

        await runtime.stop();

        assert.deepEqual(actor.received, ['в очереди']);
    });
});
