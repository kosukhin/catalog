import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry, createDefaultRegistry } from '../lib/registry.ts';
import { AbstractActor } from '../lib/actor.ts';

/** Минимальный актор для проверки реестра. */
class Stub extends AbstractActor {
    readonly type = 'Stub';
    readonly id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }

    protected override handle(): void {}
}

describe('AgentRegistry', () => {
    it('регистрирует тип и создаёт по нему актора', () => {
        const registry = new AgentRegistry().register('Stub', (id) => new Stub(id));

        assert.equal(registry.has('Stub'), true);
        assert.deepEqual(registry.types(), ['Stub']);
        assert.equal(registry.create('Stub', 's-1').type, 'Stub');
    });

    it('не даёт зарегистрировать дубль и пустой тип', () => {
        const registry = new AgentRegistry().register('Stub', (id) => new Stub(id));

        assert.throws(() => registry.register('Stub', (id) => new Stub(id)), /уже зарегистрирован/);
        assert.throws(() => registry.register('  ', (id) => new Stub(id)), /не может быть пустым/);
    });

    it('сообщает, какие типы известны, если тип не найден', () => {
        const registry = createDefaultRegistry();

        assert.throws(() => registry.create('НетТакого', 'x-1'), /неизвестный тип агента «НетТакого»; известны: EchoAgent/);
    });

    it('реестр по умолчанию содержит EchoAgent', () => {
        const registry = createDefaultRegistry();

        assert.equal(registry.has('EchoAgent'), true);
        assert.equal(registry.create('EchoAgent', 'EchoAgent-1').type, 'EchoAgent');
    });
});
