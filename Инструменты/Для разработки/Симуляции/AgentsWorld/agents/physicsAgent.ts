import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import type { Message } from '../lib/protocol/message.ts';
import { TICK } from '../lib/protocol/names.ts';
import { PHYSICS_AGENT_ID, PHYSICS_BODY, PHYSICS_LIST, PHYSICS_MOVE, PHYSICS_MOVE_TO, PHYSICS_PLACE, PHYSICS_POSITION, PHYSICS_REGISTER } from './physics/messages.ts';
import { place, register, reportPosition, reportState, requestMove, requestMoveTo } from './physics/handlers.ts';
import { advance } from './physics/motion.ts';
import { readBounds, readNumberOption, readPositive } from './physics/requests.ts';
import type { Bounds, PhysicsStatus, Point } from './physics/types.ts';

const AGENT_TYPE = 'PhysicsAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export { PHYSICS_AGENT_ID, PHYSICS_BODY, PHYSICS_LIST, PHYSICS_MOVE, PHYSICS_MOVE_TO, PHYSICS_PLACE, PHYSICS_POSITION, PHYSICS_REGISTER };

export type { ArrivalReport, Bounds, MoveReport, PhysicsBody, PhysicsState, Point } from './physics/types.ts';

export const PHYSICS_REPORT = 'physics-report';

export const PHYSICS_ARRIVED = 'physics-arrived';

export const PHYSICS_STATE = 'physics-state';

const DEFAULT_SPEED = 5;
const DEFAULT_STEP_SECONDS = 1;
const DEFAULT_MIN_DISTANCE = 1;
const DEFAULT_ARRIVE_DISTANCE = 1;
const DEFAULT_BOUNDS: Bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } };

export class PhysicsAgent extends AbstractActor {
    readonly #status: PhysicsStatus;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super(AGENT_TYPE);
        const minDistance = readNumberOption(options.minDistance, DEFAULT_MIN_DISTANCE, 'minDistance');
        this.#status = {
            speed: readNumberOption(options.speed, DEFAULT_SPEED, 'speed'),
            stepSeconds: readNumberOption(options.stepSeconds, DEFAULT_STEP_SECONDS, 'stepSeconds'),
            minDistance,
            spawnDistance: options.spawnDistance === undefined ? minDistance : readPositive(options.spawnDistance, 'spawnDistance'),
            arriveDistance: readNumberOption(options.arriveDistance, DEFAULT_ARRIVE_DISTANCE, 'arriveDistance'),
            bounds: readBounds(options.bounds, DEFAULT_BOUNDS),
            bodies: new Map<string, Point>(),
            objects: new Map<string, Point>(),
            moves: new Map(),
        };
    }

    state(): { readonly speed: number; readonly bodies: number; readonly objects: number; readonly moving: number; positionOf(id: string): Point | null } {
        const status = this.#status;
        return {
            speed: status.speed,
            bodies: status.bodies.size,
            objects: status.objects.size,
            moving: status.moves.size,
            positionOf: (id: string): Point | null => status.bodies.get(id) ?? null,
        };
    }

    start(context: ActorContext): void {
        context.log(`физика готова: ${this.#status.speed} ед./с, шаг ${this.#status.stepSeconds} с`);
        if (context.id !== PHYSICS_AGENT_ID) {
            context.log(`меня создали как ${context.id}, но остальные ищут меня по адресу ${PHYSICS_AGENT_ID}`);
        }
    }

    protected override handle(message: Message, context: ActorContext): void {
        const status = this.#status;
        if (message.type === TICK) {
            advance(status, context);
            return;
        }
        if (message.type === PHYSICS_REGISTER) {
            register(status, message.payload, context);
            return;
        }
        if (message.type === PHYSICS_MOVE) {
            requestMove(status, message.payload, context);
            return;
        }
        if (message.type === PHYSICS_MOVE_TO) {
            requestMoveTo(status, message.payload, context);
            return;
        }
        if (message.type === PHYSICS_POSITION) {
            reportPosition(status, message.payload, context);
            return;
        }
        if (message.type === PHYSICS_LIST) {
            reportState(status, message.payload, context);
            return;
        }
        if (message.type === PHYSICS_PLACE) {
            place(status, message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { bodies: this.#status.bodies.size, objects: this.#status.objects.size, moving: this.#status.moves.size, speed: this.#status.speed };
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): PhysicsAgent {
    return new PhysicsAgent(options);
}
