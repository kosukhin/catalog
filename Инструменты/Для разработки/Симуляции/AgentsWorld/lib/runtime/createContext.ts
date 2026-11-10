import type { ActorId, Message } from '../protocol/message.ts';
import type { ActorContext } from '../actor.ts';

export interface ContextPorts {
    send(to: ActorId, message: Message): void;
    log(text: string): void;
}

export function createContext(id: ActorId, ports: ContextPorts): ActorContext {
    return {
        id,
        send: (to: ActorId, message: Message): void => {
            ports.send(to, message);
        },
        log: (text: string): void => {
            ports.log(text);
        },
    };
}
