import { AbstractActor, type ActorContext } from './actor.ts';
import { createMessage, type Message } from './protocol.ts';

const AGENT_TYPE = 'RosterAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const ROSTER_AGENT_ID = 'RosterAgent-1';

export const ROSTER_SNAPSHOT = 'roster-snapshot';

export const ROSTER_QUERY = 'roster-query';

export const ROSTER_REPORT = 'roster-report';

export const ROSTER_SUBSCRIBE = 'roster-subscribe';

export const ROSTER_UPDATE = 'roster-update';

export interface RosterEntry {
    readonly id: string;
    readonly type: string;
}

export interface RosterReport {
    readonly types: readonly string[];
    readonly ids: readonly string[];
}

export interface RosterUpdate {
    readonly agents: readonly RosterEntry[];
}

export class RosterAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #agents = new Map<string, string>();
    readonly #subscribers = new Map<string, readonly string[] | null>();

    idsOfTypes(types: readonly string[]): string[] {
        return this.#matching(types).map((entry) => entry.id);
    }

    get size(): number {
        return this.#agents.size;
    }

    get subscriberCount(): number {
        return this.#subscribers.size;
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
            this.#subscribers.set(request.replyTo, request.types.length === 0 ? null : request.types);
            context.log(`${request.replyTo} подписался на агентов «${labelOf(request.types)}»`);
            this.#notify(request.replyTo, this.#matching(request.types), context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { known: this.#agents.size, subscribers: this.#subscribers.size };
    }

    #applySnapshot(payload: unknown, context: ActorContext): void {
        const entries = readEntries(payload);
        const added = entries.filter((entry) => this.#agents.get(entry.id) !== entry.type);
        this.#agents.clear();
        for (const entry of entries) {
            this.#agents.set(entry.id, entry.type);
        }
        context.log(`в реестре ${this.#agents.size} агентов`);
        for (const [replyTo, filter] of this.#subscribers) {
            const matching = filter === null ? added : added.filter((entry) => filter.includes(entry.type));
            this.#notify(replyTo, matching, context);
        }
    }

    #matching(types: readonly string[]): RosterEntry[] {
        const entries = [...this.#agents.entries()].map(([id, agentType]) => ({ id, type: agentType }));
        return types.length === 0 ? entries : entries.filter((entry) => types.includes(entry.type));
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

function readRequest(payload: unknown): { types: string[]; replyTo: string | null } {
    const candidate = payload as { types?: unknown; replyTo?: unknown } | undefined;
    return { types: readTypes(candidate?.types), replyTo: readReplyTo(candidate?.replyTo) };
}

function readTypes(value: unknown): string[] {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error('types должен быть массивом типов агентов');
    }
    const types: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string' || item.trim() === '') {
            throw new Error('каждый тип в types должен быть непустой строкой');
        }
        types.push(item);
    }
    return types;
}

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function readEntries(payload: unknown): RosterEntry[] {
    const candidate = payload as { agents?: unknown } | undefined;
    if (!Array.isArray(candidate?.agents)) {
        throw new Error('в снимке реестра нет массива agents');
    }
    const entries: RosterEntry[] = [];
    for (const item of candidate.agents) {
        const entry = item as { id?: unknown; type?: unknown } | undefined;
        if (typeof entry?.id !== 'string' || entry.id.trim() === '') {
            throw new Error('в снимке реестра у агента нет адреса (id)');
        }
        if (typeof entry.type !== 'string' || entry.type.trim() === '') {
            throw new Error(`в снимке реестра у агента «${entry.id}» нет типа (type)`);
        }
        entries.push({ id: entry.id, type: entry.type });
    }
    return entries;
}

function labelOf(types: readonly string[]): string {
    return types.length === 0 ? 'все' : types.join(', ');
}

