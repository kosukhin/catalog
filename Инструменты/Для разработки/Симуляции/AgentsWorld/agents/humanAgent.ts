import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol/message.ts';
import { TICK } from '../lib/protocol/names.ts';
import * as bank from './bankAgent.ts';
import * as bulletin from './bulletinBoardAgent.ts';
import * as catalog from './humanCatalogAgent.ts';
import * as day from './dayAgent.ts';
import * as house from './houseAgent.ts';
import * as physics from './physicsAgent.ts';
import * as toilet from './toiletAgent.ts';
import { forwardSearch, onAccount, onBulletin, onHouse, onSearchResult } from './human/economy.ts';
import { createStatus, describeOf, recordOf, type HumanStatus } from './human/status.ts';
import { askTime, applyTime } from './human/time.ts';
import { goToToilet, leaveToilet, onArrived, onPhysicsReport, retryToilet, waitForToilet } from './human/toilet.ts';

const AGENT_TYPE = 'HumanAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export class HumanAgent extends AbstractActor {
    readonly #status: HumanStatus;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super(AGENT_TYPE);
        this.#status = createStatus(options);
    }

    state(): HumanStatus {
        return this.#status;
    }

    start(context: ActorContext): void {
        const status = this.#status;
        context.log(`я ${status.name}, ${status.gender}, ${status.profession}`);
        context.send(catalog.HUMAN_CATALOG_AGENT_ID, createMessage(catalog.CATALOG_REGISTER, recordOf(status, context.id)));
        context.send(physics.PHYSICS_AGENT_ID, createMessage(physics.PHYSICS_REGISTER, { id: context.id }));
        askTime(context);
    }

    protected override handle(message: Message, context: ActorContext): void {
        const status = this.#status;
        if (message.type === TICK) {
            askTime(context);
            retryToilet(status, context);
            return;
        }
        if (message.type === day.TIME_REPORT) {
            applyTime(status, message.payload, context);
            return;
        }
        if (message.type === bulletin.BULLETIN_RESULT) {
            onBulletin(status, message.payload, context);
            return;
        }
        if (message.type === bank.BANK_ACCOUNT) {
            onAccount(status, message.payload, context);
            return;
        }
        if (message.type === house.HOUSE_REPORT) {
            onHouse(status, message.payload, context);
            return;
        }
        if (message.type === toilet.TOILET_GRANTED) {
            goToToilet(status, context);
            return;
        }
        if (message.type === toilet.TOILET_QUEUED) {
            waitForToilet(status, context);
            return;
        }
        if (message.type === toilet.TOILET_RELEASED) {
            leaveToilet(status, context);
            return;
        }
        if (message.type === physics.PHYSICS_ARRIVED) {
            onArrived(status, context);
            return;
        }
        if (message.type === physics.PHYSICS_REPORT) {
            onPhysicsReport(status, message.payload, context);
            return;
        }
        if (message.type === catalog.CATALOG_SEARCH) {
            forwardSearch(message.payload, context);
            return;
        }
        if (message.type === catalog.CATALOG_RESULT) {
            onSearchResult(message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return describeOf(this.#status);
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): HumanAgent {
    return new HumanAgent(options);
}
