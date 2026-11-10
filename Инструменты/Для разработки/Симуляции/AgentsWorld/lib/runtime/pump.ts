import type { Mailbox } from '../mailbox.ts';
import type { Actor, ActorContext } from '../actor.ts';

export async function pump(
    mailbox: Mailbox,
    actor: Actor,
    context: ActorContext,
    onError: (error: unknown) => void,
): Promise<void> {
    for (;;) {
        const envelope = await mailbox.take();
        if (envelope === undefined) {
            return;
        }
        try {
            await actor.receive(envelope.message, context);
        } catch (error) {
            onError(error);
        }
    }
}
