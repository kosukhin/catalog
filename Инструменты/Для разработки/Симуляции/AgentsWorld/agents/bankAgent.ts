import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol/message.ts';
import type { ChargeRequest } from './bank/accounts.ts';
import { pay, send } from './bank/accounts.ts';
import { readChargeRequest, readOwnerRequest, readPositiveOption } from './bank/requests.ts';

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

interface BankStatus {
    readonly deposit: number;
    readonly accounts: Map<string, number>;
}

export class BankAgent extends AbstractActor {
    readonly #status: BankStatus;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super(AGENT_TYPE);
        this.#status = { deposit: readPositiveOption(options.deposit, DEFAULT_DEPOSIT, 'deposit'), accounts: new Map<string, number>() };
    }

    state(): { readonly deposit: number; readonly accounts: number; balanceOf(owner: string): number | null } {
        return {
            deposit: this.#status.deposit,
            accounts: this.#status.accounts.size,
            balanceOf: (owner: string): number | null => this.#status.accounts.get(owner) ?? null,
        };
    }

    start(context: ActorContext): void {
        context.log(`банк открыт, депозит ${this.#status.deposit}`);
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
        return { deposit: this.#status.deposit, accounts: this.#status.accounts.size };
    }

    #open(payload: unknown, context: ActorContext): void {
        const request = readOwnerRequest(payload);
        const created = !this.#status.accounts.has(request.owner);
        if (created) {
            this.#status.accounts.set(request.owner, this.#status.deposit);
        }
        const balance = this.#status.accounts.get(request.owner) ?? this.#status.deposit;
        context.log(created ? `счёт «${request.owner}» открыт, депозит ${balance}` : `счёт «${request.owner}» уже есть: ${balance}`);
        send(request.replyTo, BANK_ACCOUNT, { owner: request.owner, balance }, context);
    }

    #charge(payload: unknown, context: ActorContext): void {
        const request = readChargeRequest(payload);
        const balance = this.#status.accounts.get(request.owner);
        if (balance === undefined) {
            this.#refuse(request, 0, `нет счёта у «${request.owner}»`, context);
            return;
        }
        if (balance < request.amount) {
            this.#refuse(request, balance, `недостаточно средств: ${balance} < ${request.amount}`, context);
            return;
        }
        const next = balance - request.amount;
        this.#status.accounts.set(request.owner, next);
        context.log(`списали ${request.amount} со счёта «${request.owner}», осталось ${next}`);
        pay(request, true, next, null, BANK_PAYMENT, context);
    }

    #refuse(request: ChargeRequest, balance: number, reason: string, context: ActorContext): void {
        pay(request, false, balance, reason, BANK_PAYMENT, context);
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): BankAgent {
    return new BankAgent(options);
}
