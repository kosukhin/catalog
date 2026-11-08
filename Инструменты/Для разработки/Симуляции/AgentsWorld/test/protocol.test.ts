import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMessage, isMessage } from '../src/protocol.ts';

describe('protocol', () => {
    it('createMessage без нагрузки не добавляет ключ payload', () => {
        const message = createMessage('ping');

        assert.equal(message.type, 'ping');
        assert.equal('payload' in message, false);
    });

    it('createMessage сохраняет нагрузку', () => {
        const message = createMessage('echo', { text: 'привет' });

        assert.deepEqual(message, { type: 'echo', payload: { text: 'привет' } });
    });

    it('createMessage отвергает пустой тип', () => {
        assert.throws(() => createMessage('  '), /тип сообщения/);
    });

    it('isMessage отсекает не-сообщения', () => {
        assert.equal(isMessage(createMessage('ping')), true);
        assert.equal(isMessage({ type: 'ping', payload: 1 }), true);
        assert.equal(isMessage({ type: '' }), false);
        assert.equal(isMessage({}), false);
        assert.equal(isMessage(null), false);
        assert.equal(isMessage('ping'), false);
    });
});
