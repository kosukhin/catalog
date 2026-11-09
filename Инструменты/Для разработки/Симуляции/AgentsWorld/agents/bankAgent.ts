import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

const AGENT_TYPE = 'BankAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const BANK_AGENT_ID = 'BankAgent-1';

export const BANK_OPEN = 'bank-open';

export const BANK_ACCOUNT = 'bank-account';

export const BANK_CHARGE = 'bank-charge';

export const BANK_PAYMENT = 'bank-payment';

export interface AccountReport {
    readonly owner: string;
    readonly balance: number;
}

export interface PaymentReport {
    readonly owner: string;
    readonly amount: number;
    readonly accepted: boolean;
    readonly balance: number;
    readonly reason: string | null;
}

const DEFAULT_DEPOSIT = 1000;

interface OwnerRequest {
    readonly owner: string;
    readonly replyTo: string | null;
}

interface ChargeRequest {
    readonly owner: string;
    readonly amount: number;
    readonly replyTo: string | null;
}

export class BankAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #deposit: number;
    readonly #accounts = new Map<string, number>();

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#deposit = readPositiveOption(options.deposit, DEFAULT_DEPOSIT, 'deposit');
    }

    get deposit(): number {
        return this.#deposit;
    }

    get accountCount(): number {
        return this.#accounts.size;
    }

    balanceOf(owner: string): number | null {
        return this.#accounts.get(owner) ?? null;
    }

    start(context: ActorContext): void {
        context.log(`банк открыт, депозит ${this.#deposit}`);
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === BANK_OPEN) {
            this.#open(message.payload, context);
            return;
        }
        if (message.type === BANK_CHARGE) {
            this.#charge(message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { deposit: this.#deposit, accounts: this.#accounts.size };
    }

    #open(payload: unknown, context: ActorContext): void {
        const request = readOwnerRequest(payload);
        const created = !this.#accounts.has(request.owner);
        if (created) {
            this.#accounts.set(request.owner, this.#deposit);
        }
        const balance = this.#accounts.get(request.owner) ?? this.#deposit;
        context.log(created ? `счёт «${request.owner}» открыт, депозит ${balance}` : `счёт «${request.owner}» уже есть: ${balance}`);
        this.#send(request.replyTo, BANK_ACCOUNT, { owner: request.owner, balance }, context);
    }

    #charge(payload: unknown, context: ActorContext): void {
        const request = readChargeRequest(payload);
        const balance = this.#accounts.get(request.owner);
        if (balance === undefined) {
            this.#pay(request, false, 0, `нет счёта у «${request.owner}»`, context);
            return;
        }
        if (balance < request.amount) {
            this.#pay(request, false, balance, `недостаточно средств: ${balance} < ${request.amount}`, context);
            return;
        }
        const next = balance - request.amount;
        this.#accounts.set(request.owner, next);
        context.log(`списали ${request.amount} со счёта «${request.owner}», осталось ${next}`);
        this.#pay(request, true, next, null, context);
    }

    #pay(request: ChargeRequest, accepted: boolean, balance: number, reason: string | null, context: ActorContext): void {
        const report: PaymentReport = { owner: request.owner, amount: request.amount, accepted, balance, reason };
        this.#send(request.replyTo, BANK_PAYMENT, report, context);
    }

    #send(replyTo: string | null, messageType: string, payload: unknown, context: ActorContext): void {
        if (replyTo === null) {
            context.log('ответ отправлять некому: нет обратного адреса');
            return;
        }
        context.send(replyTo, createMessage(messageType, payload));
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): BankAgent {
    return new BankAgent(options);
}

function readOwnerRequest(payload: unknown): OwnerRequest {
    const candidate = payload as { owner?: unknown; replyTo?: unknown } | undefined;
    return { owner: readOwner(candidate?.owner), replyTo: readReplyTo(candidate?.replyTo) };
}

function readChargeRequest(payload: unknown): ChargeRequest {
    const candidate = payload as { owner?: unknown; amount?: unknown; replyTo?: unknown } | undefined;
    return { owner: readOwner(candidate?.owner), amount: readPositive(candidate?.amount, 'amount'), replyTo: readReplyTo(candidate?.replyTo) };
}

function readOwner(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('в сообщении нет владельца счёта (owner)');
    }
    return value;
}

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function readPositive(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} должен быть положительным числом`);
    }
    return value;
}

function readPositiveOption(value: unknown, fallback: number, name: string): number {
    return value === undefined ? fallback : readPositive(value, name);
}
