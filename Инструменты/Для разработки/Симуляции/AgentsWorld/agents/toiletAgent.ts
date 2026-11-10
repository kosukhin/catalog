import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol/message.ts';
import { TICK } from '../lib/protocol/names.ts';
import { DAY_AGENT_ID, TIME_REPORT } from './dayAgent.ts';
import { PHYSICS_AGENT_ID, PHYSICS_BODY, PHYSICS_REGISTER, type Point } from './physicsAgent.ts';
import { TOILET_AGENT_ID, TOILET_ENTER, TOILET_GRANTED, TOILET_LEAVE, TOILET_QUEUED, TOILET_RELEASED, TOILET_REQUEST } from './toilet/messages.ts';
import { askTime, enter, leave, onTime } from './toilet/occupancy.ts';
import { choose, onPosition, request } from './toilet/queue.ts';
import { readPoint, readPositiveOption, readText, type ToiletStatus } from './toilet/status.ts';

const AGENT_TYPE = 'ToiletAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export { TOILET_AGENT_ID, TOILET_ENTER, TOILET_GRANTED, TOILET_LEAVE, TOILET_QUEUED, TOILET_RELEASED, TOILET_REQUEST };

const DEFAULT_MINUTES = 20;

const DEFAULT_POSITION: Point = { x: 0, y: 0, z: 0 };

export class ToiletAgent extends AbstractActor {
    readonly #status: ToiletStatus;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super(AGENT_TYPE);
        this.#status = {
            minutes: readPositiveOption(options.minutes, DEFAULT_MINUTES, 'minutes'),
            position: readPoint(options.position, DEFAULT_POSITION),
            physicsId: readText(options.physicsId, PHYSICS_AGENT_ID, 'physicsId'),
            dayId: readText(options.dayId, DAY_AGENT_ID, 'dayId'),
            walking: new Set<string>(),
            queue: [],
            distances: new Map<string, number>(),
            occupant: null,
            enteredAt: null,
            choosing: null,
            justLeft: null,
        };
    }

    state(): { readonly minutes: number; readonly occupant: string | null; readonly queueLength: number } {
        return { minutes: this.#status.minutes, occupant: this.#status.occupant, queueLength: this.#status.queue.length };
    }

    start(context: ActorContext): void {
        context.log(`туалет на ${this.#status.minutes} игровых минут, одно место`);
        context.send(this.#status.physicsId, createMessage(PHYSICS_REGISTER, { id: TOILET_AGENT_ID, position: this.#status.position }));
    }

    protected override handle(message: Message, context: ActorContext): void {
        const status = this.#status;
        if (message.type === TICK) {
            if (status.occupant !== null) {
                askTime(status, context);
            }
            choose(status, context);
            return;
        }
        if (message.type === TOILET_REQUEST) {
            request(status, message.payload, context);
            return;
        }
        if (message.type === TOILET_ENTER) {
            enter(status, message.payload, context);
            return;
        }
        if (message.type === TOILET_LEAVE) {
            leave(status, message.payload, context);
            return;
        }
        if (message.type === PHYSICS_BODY) {
            onPosition(status, message.payload, context);
            return;
        }
        if (message.type === TIME_REPORT) {
            onTime(status, message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { minutes: this.#status.minutes, occupant: this.#status.occupant, queue: this.#status.queue.length };
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): ToiletAgent {
    return new ToiletAgent(options);
}
