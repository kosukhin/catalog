import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';
import { ROSTER_AGENT_ID, ROSTER_QUERY, ROSTER_REPORT } from '../lib/rosterAgent.ts';

const AGENT_TYPE = 'BulletinBoardAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const BULLETIN_BOARD_AGENT_ID = 'BulletinBoardAgent-1';

export const BULLETIN_FIND = 'bulletin-find';

export const BULLETIN_RESULT = 'bulletin-result';

export interface BulletinResult {
    readonly type: string;
    readonly ids: readonly string[];
}

export class BulletinBoardAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #rosterId: string;
    readonly #queue = new Map<string, string[]>();

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#rosterId = readText(options.rosterId, ROSTER_AGENT_ID, 'rosterId');
    }

    get pendingCount(): number {
        let total = 0;
        for (const queue of this.#queue.values()) {
            total += queue.length;
        }
        return total;
    }

    waitingFor(kind: string): number {
        return this.#queue.get(kind)?.length ?? 0;
    }

    start(context: ActorContext): void {
        context.log(`доска объявлений спрашивает реестр ${this.#rosterId}`);
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === BULLETIN_FIND) {
            this.#find(message.payload, context);
            return;
        }
        if (message.type === ROSTER_REPORT) {
            this.#answer(message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { waiting: this.pendingCount };
    }

    #find(payload: unknown, context: ActorContext): void {
        const candidate = payload as { type?: unknown; replyTo?: unknown } | undefined;
        const kind = readText(candidate?.type, '', 'type');
        const replyTo = readReplyTo(candidate?.replyTo);
        if (replyTo === null) {
            context.log('искали без обратного адреса, ответить некому');
            return;
        }
        const queue = this.#queue.get(kind);
        if (queue === undefined) {
            this.#queue.set(kind, [replyTo]);
        } else {
            queue.push(replyTo);
        }
        context.send(this.#rosterId, createMessage(ROSTER_QUERY, { types: [kind], replyTo: BULLETIN_BOARD_AGENT_ID }));
    }

    #answer(payload: unknown, context: ActorContext): void {
        const candidate = payload as { types?: unknown; ids?: unknown } | undefined;
        const types = Array.isArray(candidate?.types) ? candidate.types.filter((item): item is string => typeof item === 'string') : [];
        const kind = types[0] ?? '';
        const queue = this.#queue.get(kind);
        const replyTo = queue?.shift();
        if (queue !== undefined && queue.length === 0) {
            this.#queue.delete(kind);
        }
        if (replyTo === undefined) {
            context.log(`пришёл ответ по типу «${kind}», а запроса не было`);
            return;
        }
        const ids = Array.isArray(candidate?.ids) ? candidate.ids.filter((item): item is string => typeof item === 'string') : [];
        context.log(`нашёл «${kind}»: ${ids.length}`);
        const result: BulletinResult = { type: kind, ids };
        context.send(replyTo, createMessage(BULLETIN_RESULT, result));
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): BulletinBoardAgent {
    return new BulletinBoardAgent(options);
}

function readText(value: unknown, fallback: string, name: string): string {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${name} должен быть непустой строкой`);
    }
    return value;
}

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}
