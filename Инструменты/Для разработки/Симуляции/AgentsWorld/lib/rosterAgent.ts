import { AbstractActor, type ActorContext } from './actor.ts';
import { createMessage } from './protocol/message.ts';
import type { Message } from './protocol/message.ts';
import { labelOf, matches, type RosterEntry, type RosterReport, type RosterUpdate } from './roster/entries.ts';
import { readEntries, readRequest } from './roster/readRequest.ts';

const AGENT_TYPE = 'RosterAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const ROSTER_AGENT_ID = 'RosterAgent-1';

export const ROSTER_SNAPSHOT = 'roster-snapshot';

export const ROSTER_QUERY = 'roster-query';

export const ROSTER_REPORT = 'roster-report';

export const ROSTER_SUBSCRIBE = 'roster-subscribe';

export const ROSTER_UPDATE = 'roster-update';

interface RosterStatus {
    readonly agents: Map<string, string>;
    readonly subscribers: Map<string, readonly string[] | null>;
}

export class RosterAgent extends AbstractActor {
    readonly #status: RosterStatus = { agents: new Map<string, string>(), subscribers: new Map<string, readonly string[] | null>() };

    constructor() {
        super(AGENT_TYPE);
    }

    idsOfTypes(types: readonly string[]): string[] {
        return matches(this.#status.agents, types).map((entry) => entry.id);
    }

    state(): { readonly known: number; readonly subscribers: number } {
        return { known: this.#status.agents.size, subscribers: this.#status.subscribers.size };
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === ROSTER_SNAPSHOT) {
            this.#applySnapshot(message.payload, context);
            return;
        }
        if (message.type === ROSTER_QUERY) {
            const request = readRequest(message.payload);
            const ids = this.idsOfTypes(request.types);
            context.log(`спросили «${labelOf(request.types)}»: найдено ${ids.length}`);
            if (request.replyTo === null) {
                context.log('запрос пришёл без обратного адреса, ответить некому');
                return;
            }
            const report: RosterReport = { types: request.types, ids };
            context.send(request.replyTo, createMessage(ROSTER_REPORT, report));
            return;
        }
        if (message.type === ROSTER_SUBSCRIBE) {
            const request = readRequest(message.payload);
            if (request.replyTo === null) {
                context.log('подписка пришла без обратного адреса, уведомлять некого');
                return;
            }
            this.#status.subscribers.set(request.replyTo, request.types.length === 0 ? null : request.types);
            context.log(`${request.replyTo} подписался на агентов «${labelOf(request.types)}»`);
            this.#notify(request.replyTo, matches(this.#status.agents, request.types), context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { known: this.#status.agents.size, subscribers: this.#status.subscribers.size };
    }

    #applySnapshot(payload: unknown, context: ActorContext): void {
        const entries = readEntries(payload);
        const added = entries.filter((entry) => this.#status.agents.get(entry.id) !== entry.type);
        this.#status.agents.clear();
        for (const entry of entries) {
            this.#status.agents.set(entry.id, entry.type);
        }
        context.log(`в реестре ${this.#status.agents.size} агентов`);
        for (const [replyTo, filter] of this.#status.subscribers) {
            const matching = filter === null ? added : added.filter((entry) => filter.includes(entry.type));
            this.#notify(replyTo, matching, context);
        }
    }

    #notify(replyTo: string, agents: readonly RosterEntry[], context: ActorContext): void {
        if (agents.length === 0) {
            return;
        }
        const update: RosterUpdate = { agents };
        context.send(replyTo, createMessage(ROSTER_UPDATE, update));
    }
}

export function createAgent(_id: string, _options: Readonly<Record<string, unknown>> = {}): RosterAgent {
    return new RosterAgent();
}
