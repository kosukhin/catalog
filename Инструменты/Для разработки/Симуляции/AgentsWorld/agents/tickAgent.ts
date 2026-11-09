import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, TICK, type Message } from '../lib/protocol.ts';
import {
    ROSTER_AGENT_ID,
    ROSTER_QUERY,
    ROSTER_REPORT,
    ROSTER_SUBSCRIBE,
    ROSTER_UPDATE,
    type RosterEntry,
} from '../lib/rosterAgent.ts';

const AGENT_TYPE = 'TickAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const TICK_AGENT_ID = 'TickAgent-1';

const DEFAULT_INTERVAL_MS = 1000;

export interface TickAgentOptions {
    readonly intervalMs: number;
    readonly types: readonly string[];
    readonly rosterId: string;
}

export class TickAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #intervalMs: number;
    readonly #types: readonly string[];
    readonly #rosterId: string;
    #timer: ReturnType<typeof setInterval> | null = null;
    #recipients: string[] = [];

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#intervalMs = readInterval(options.intervalMs);
        this.#types = readTypes(options.types);
        this.#rosterId = readRosterId(options.rosterId);
    }

    get intervalMs(): number {
        return this.#intervalMs;
    }

    get types(): readonly string[] {
        return this.#types;
    }

    get recipientCount(): number {
        return this.#recipients.length;
    }

    start(context: ActorContext): void {
        context.log(`бужу «${this.#types.join(', ')}» каждые ${this.#intervalMs} мс через реестр ${this.#rosterId}`);
        context.send(this.#rosterId, createMessage(ROSTER_QUERY, { types: [...this.#types], replyTo: context.id }));
        context.send(this.#rosterId, createMessage(ROSTER_SUBSCRIBE, { types: [...this.#types], replyTo: context.id }));
        this.#timer = setInterval(() => {
            for (const recipient of this.#recipients) {
                context.send(recipient, createMessage(TICK));
            }
        }, this.#intervalMs);
    }

    stop(): void {
        if (this.#timer !== null) {
            clearInterval(this.#timer);
            this.#timer = null;
        }
    }

    describeForDashboard(): Readonly<Record<string, unknown>> {
        return this.describe();
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === ROSTER_REPORT) {
            this.#recipients = readIds(message.payload);
            context.log(`реестр дал ${this.#recipients.length} агентов для тиков`);
            return;
        }
        if (message.type === ROSTER_UPDATE) {
            this.#merge(readAgents(message.payload), context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { intervalMs: this.#intervalMs, types: this.#types, recipients: this.#recipients.length };
    }

    #merge(agents: readonly RosterEntry[], context: ActorContext): void {
        const added: string[] = [];
        for (const agent of agents) {
            if (!this.#types.includes(agent.type) || this.#recipients.includes(agent.id)) {
                continue;
            }
            this.#recipients.push(agent.id);
            added.push(agent.id);
        }
        if (added.length > 0) {
            context.log(`новые агенты получат тики: ${added.join(', ')}`);
        }
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): TickAgent {
    return new TickAgent(options);
}

function readInterval(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_INTERVAL_MS;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error('intervalMs должен быть целым положительным числом миллисекунд');
    }
    return value;
}

function readTypes(value: unknown): string[] {
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
    if (types.length === 0) {
        throw new Error('types должен содержать хотя бы один тип агента');
    }
    return types;
}

function readRosterId(value: unknown): string {
    if (value === undefined) {
        return ROSTER_AGENT_ID;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('rosterId должен быть непустой строкой');
    }
    return value;
}

function readIds(payload: unknown): string[] {
    const candidate = payload as { ids?: unknown } | undefined;
    if (!Array.isArray(candidate?.ids)) {
        throw new Error('в ответе реестра нет массива ids');
    }
    const ids: string[] = [];
    for (const item of candidate.ids) {
        if (typeof item !== 'string' || item.trim() === '') {
            throw new Error('каждый id в ответе реестра должен быть непустой строкой');
        }
        ids.push(item);
    }
    return ids;
}

function readAgents(payload: unknown): RosterEntry[] {
    const candidate = payload as { agents?: unknown } | undefined;
    if (!Array.isArray(candidate?.agents)) {
        throw new Error('в уведомлении реестра нет массива agents');
    }
    const agents: RosterEntry[] = [];
    for (const item of candidate.agents) {
        const agent = item as { id?: unknown; type?: unknown } | undefined;
        if (typeof agent?.id !== 'string' || agent.id.trim() === '') {
            throw new Error('в уведомлении реестра у агента нет адреса (id)');
        }
        if (typeof agent.type !== 'string' || agent.type.trim() === '') {
            throw new Error(`в уведомлении реестра у агента «${agent.id}» нет типа (type)`);
        }
        agents.push({ id: agent.id, type: agent.type });
    }
    return agents;
}

