import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Mailbox } from '../src/mailbox.ts';
import { createMessage } from '../src/protocol.ts';

describe('Mailbox', () => {
    it('выдаёт сообщения в порядке FIFO', async () => {
        const mailbox = new Mailbox();
        mailbox.put({ from: 'a', message: createMessage('первое') });
        mailbox.put({ from: 'b', message: createMessage('второе') });

        assert.equal(mailbox.size, 2);

        const first = await mailbox.take();
        const second = await mailbox.take();
        assert.equal(first?.message.type, 'первое');
        assert.equal(first?.from, 'a');
        assert.equal(second?.message.type, 'второе');
        assert.equal(mailbox.size, 0);
    });

    it('take ждёт сообщение, если очередь пуста', async () => {
        const mailbox = new Mailbox();
        const pending = mailbox.take();

        mailbox.put({ from: 'a', message: createMessage('позднее') });

        assert.equal((await pending)?.message.type, 'позднее');
    });

    it('закрытый ящик не принимает новые сообщения', () => {
        const mailbox = new Mailbox();
        mailbox.close();

        assert.equal(mailbox.closed, true);
        assert.equal(mailbox.put({ from: 'a', message: createMessage('мимо') }), false);
    });

    it('после close ожидающий take получает undefined', async () => {
        const mailbox = new Mailbox();
        const pending = mailbox.take();

        mailbox.close();

        assert.equal(await pending, undefined);
        assert.equal(await mailbox.take(), undefined);
    });

    it('закрытие не теряет уже накопленные сообщения', async () => {
        const mailbox = new Mailbox();
        mailbox.put({ from: 'a', message: createMessage('в очереди') });
        mailbox.close();

        assert.equal((await mailbox.take())?.message.type, 'в очереди');
        assert.equal(await mailbox.take(), undefined);
    });
});
