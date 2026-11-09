import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';
import { BANK_AGENT_ID, BANK_CHARGE, BANK_PAYMENT } from './bankAgent.ts';
import { PHYSICS_AGENT_ID, PHYSICS_BODY, PHYSICS_PLACE, PHYSICS_POSITION, type Point } from './physicsAgent.ts';

const AGENT_TYPE = 'HouseAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const HOUSE_AGENT_ID = 'HouseAgent-1';

export const HOUSE_BUY = 'house-buy';

export const HOUSE_REPORT = 'house-report';

export interface HouseRecord {
    readonly id: string;
    readonly owner: string;
    readonly position: Point;
}

const DEFAULT_PRICE = 800;

interface Pending {
    readonly owner: string;
    readonly replyTo: string;
}

export class HouseAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #price: number;
    readonly #bankId: string;
    readonly #physicsId: string;
    readonly #houses = new Map<string, HouseRecord>();
    readonly #pending = new Map<string, Pending>();

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#price = readPositiveOption(options.price, DEFAULT_PRICE, 'price');
        this.#bankId = readText(options.bankId, BANK_AGENT_ID, 'bankId');
        this.#physicsId = readText(options.physicsId, PHYSICS_AGENT_ID, 'physicsId');
    }

    get price(): number {
        return this.#price;
    }

    get houseCount(): number {
        return this.#houses.size;
    }

    houseOf(owner: string): HouseRecord | null {
        return this.#houses.get(owner) ?? null;
    }

    start(context: ActorContext): void {
        context.log(`дома по ${this.#price}, банк ${this.#bankId}`);
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === HOUSE_BUY) {
            this.#buy(message.payload, context);
            return;
        }
        if (message.type === BANK_PAYMENT) {
            this.#onPayment(message.payload, context);
            return;
        }
        if (message.type === PHYSICS_BODY) {
            this.#onPosition(message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { price: this.#price, houses: this.#houses.size };
    }

    #buy(payload: unknown, context: ActorContext): void {
        const candidate = payload as { owner?: unknown; bankId?: unknown; replyTo?: unknown } | undefined;
        const owner = readOwner(candidate?.owner);
        const replyTo = readReplyTo(candidate?.replyTo);
        if (replyTo === null) {
            context.log('покупатель без обратного адреса');
            return;
        }
        const existing = this.#houses.get(owner);
        if (existing !== undefined) {
            this.#report(replyTo, existing, true, 'дом уже куплен', context);
            return;
        }
        const bankId = typeof candidate?.bankId === 'string' && candidate.bankId.trim() !== '' ? candidate.bankId : this.#bankId;
        this.#pending.set(owner, { owner, replyTo });
        context.send(bankId, createMessage(BANK_CHARGE, { owner, amount: this.#price, replyTo: HOUSE_AGENT_ID }));
    }

    #onPayment(payload: unknown, context: ActorContext): void {
        const candidate = payload as { owner?: unknown; accepted?: unknown; reason?: unknown } | undefined;
        const owner = readOwner(candidate?.owner);
        const pending = this.#pending.get(owner);
        if (pending === undefined) {
            context.log(`оплата для «${owner}», а покупки не было`);
            return;
        }
        if (candidate?.accepted !== true) {
            this.#pending.delete(owner);
            const reason = typeof candidate?.reason === 'string' ? candidate.reason : 'банк отказал';
            context.log(`банк отказал «${owner}»: ${reason}`);
            this.#report(pending.replyTo, null, false, reason, context);
            return;
        }
        context.send(this.#physicsId, createMessage(PHYSICS_POSITION, { id: owner, replyTo: HOUSE_AGENT_ID }));
    }

    #onPosition(payload: unknown, context: ActorContext): void {
        const candidate = payload as { id?: unknown; body?: unknown } | undefined;
        const owner = typeof candidate?.id === 'string' ? candidate.id : '';
        const pending = this.#pending.get(owner);
        if (pending === undefined) {
            return;
        }
        this.#pending.delete(owner);
        const body = candidate?.body as { position?: Point } | null | undefined;
        if (body === null || body === undefined || typeof body.position !== 'object' || body.position === null) {
            context.log(`у «${owner}» нет точки в пространстве`);
            this.#report(pending.replyTo, null, false, 'нет точки в пространстве', context);
            return;
        }
        const record: HouseRecord = { id: `House-${owner}`, owner, position: body.position };
        this.#houses.set(owner, record);
        context.send(this.#physicsId, createMessage(PHYSICS_PLACE, { id: record.id, position: record.position }));
        context.log(`дом для «${owner}» стоит в точке (${record.position.x}; ${record.position.y}; ${record.position.z})`);
        this.#report(pending.replyTo, record, true, null, context);
    }

    #report(replyTo: string, house: HouseRecord | null, accepted: boolean, reason: string | null, context: ActorContext): void {
        const payload = { owner: house?.owner ?? null, houseId: house?.id ?? null, position: house?.position ?? null, accepted, reason };
        context.send(replyTo, createMessage(HOUSE_REPORT, payload));
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): HouseAgent {
    return new HouseAgent(options);
}

function readOwner(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('в покупке нет владельца (owner)');
    }
    return value;
}

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
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

function readPositiveOption(value: unknown, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} должен быть положительным числом`);
    }
    return value;
}

