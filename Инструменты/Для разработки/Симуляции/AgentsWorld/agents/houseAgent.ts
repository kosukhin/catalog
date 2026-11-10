import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import type { Message } from '../lib/protocol/message.ts';
import { BANK_PAYMENT } from './bankAgent.ts';
import { PHYSICS_AGENT_ID, PHYSICS_BODY } from './physicsAgent.ts';
import { HOUSE_AGENT_ID, HOUSE_BUY, HOUSE_REPORT } from './house/messages.ts';
import { buy } from './house/purchase.ts';
import { onPayment, onPosition } from './house/settlement.ts';
import { readPositiveOption, readText, type HouseRecord, type HouseStatus } from './house/status.ts';

const AGENT_TYPE = 'HouseAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export { HOUSE_AGENT_ID, HOUSE_BUY, HOUSE_REPORT };

export type { HouseRecord };

const DEFAULT_PRICE = 800;

export class HouseAgent extends AbstractActor {
    readonly #status: HouseStatus;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super(AGENT_TYPE);
        this.#status = {
            price: readPositiveOption(options.price, DEFAULT_PRICE, 'price'),
            bankId: readText(options.bankId, 'BankAgent-1', 'bankId'),
            physicsId: readText(options.physicsId, PHYSICS_AGENT_ID, 'physicsId'),
            houses: new Map<string, HouseRecord>(),
            pending: new Map(),
        };
    }

    state(): { readonly price: number; readonly houses: number; houseOf(owner: string): HouseRecord | null } {
        return {
            price: this.#status.price,
            houses: this.#status.houses.size,
            houseOf: (owner: string): HouseRecord | null => this.#status.houses.get(owner) ?? null,
        };
    }

    start(context: ActorContext): void {
        context.log(`дома по ${this.#status.price}, банк ${this.#status.bankId}`);
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === HOUSE_BUY) {
            buy(this.#status, message.payload, context);
            return;
        }
        if (message.type === BANK_PAYMENT) {
            onPayment(this.#status, message.payload, context);
            return;
        }
        if (message.type === PHYSICS_BODY) {
            onPosition(this.#status, message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { price: this.#status.price, houses: this.#status.houses.size };
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): HouseAgent {
    return new HouseAgent(options);
}
