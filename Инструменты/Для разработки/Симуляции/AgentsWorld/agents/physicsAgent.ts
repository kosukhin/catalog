import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, TICK, type Message } from '../lib/protocol.ts';

const AGENT_TYPE = 'PhysicsAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const PHYSICS_AGENT_ID = 'PhysicsAgent-1';

export const PHYSICS_REGISTER = 'physics-register';

export const PHYSICS_MOVE = 'physics-move';

export const PHYSICS_MOVE_TO = 'physics-move-to';

export const PHYSICS_REPORT = 'physics-report';

export const PHYSICS_ARRIVED = 'physics-arrived';

export const PHYSICS_POSITION = 'physics-position';

export const PHYSICS_BODY = 'physics-body';

export const PHYSICS_LIST = 'physics-list';

export const PHYSICS_STATE = 'physics-state';

export interface Point {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface PhysicsBody {
    readonly id: string;
    readonly position: Point;
}

export interface Bounds {
    readonly min: Point;
    readonly max: Point;
}

export interface PhysicsAgentOptions {
    readonly speed: number;
    readonly stepSeconds: number;
    readonly minDistance: number;
    readonly arriveDistance: number;
    readonly bounds: Bounds;
}

export interface MoveReport {
    readonly id: string;
    readonly accepted: boolean;
    readonly reason: string | null;
    readonly position: Point;
}

export interface ArrivalReport {
    readonly id: string;
    readonly position: Point;
    readonly reason: string | null;
}

export interface PhysicsState {
    readonly speed: number;
    readonly stepSeconds: number;
    readonly minDistance: number;
    readonly arriveDistance: number;
    readonly bounds: Bounds;
    readonly bodies: readonly PhysicsBody[];
    readonly moving: readonly string[];
}

const DEFAULT_SPEED = 5;
const DEFAULT_STEP_SECONDS = 1;
const DEFAULT_MIN_DISTANCE = 1;
const DEFAULT_ARRIVE_DISTANCE = 1;
const DEFAULT_BOUNDS: Bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } };
const ZERO: Point = { x: 0, y: 0, z: 0 };
const EPSILON = 1e-9;

interface Move {
    readonly kind: 'segment' | 'pursue';
    readonly goal: Point | null;
    readonly targetId: string | null;
    readonly requester: string | null;
}

export class PhysicsAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #speed: number;
    readonly #stepSeconds: number;
    readonly #minDistance: number;
    readonly #spawnDistance: number;
    readonly #arriveDistance: number;
    readonly #bounds: Bounds;
    readonly #bodies = new Map<string, Point>();
    readonly #moves = new Map<string, Move>();

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#speed = readNumberOption(options.speed, DEFAULT_SPEED, 'speed');
        this.#stepSeconds = readNumberOption(options.stepSeconds, DEFAULT_STEP_SECONDS, 'stepSeconds');
        this.#minDistance = readNumberOption(options.minDistance, DEFAULT_MIN_DISTANCE, 'minDistance');
        this.#spawnDistance = options.spawnDistance === undefined ? this.#minDistance : readPositive(options.spawnDistance, 'spawnDistance');
        this.#arriveDistance = readNumberOption(options.arriveDistance, DEFAULT_ARRIVE_DISTANCE, 'arriveDistance');
        this.#bounds = readBounds(options.bounds, DEFAULT_BOUNDS);
    }

    get speed(): number {
        return this.#speed;
    }

    get bodyCount(): number {
        return this.#bodies.size;
    }

    get movingCount(): number {
        return this.#moves.size;
    }

    positionOf(id: string): Point | null {
        return this.#bodies.get(id) ?? null;
    }

    start(context: ActorContext): void {
        context.log(`физика готова: ${this.#speed} ед./с, шаг ${this.#stepSeconds} с`);
        if (context.id !== PHYSICS_AGENT_ID) {
            context.log(`меня создали как ${context.id}, но остальные ищут меня по адресу ${PHYSICS_AGENT_ID}`);
        }
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === TICK) {
            this.#advance(context);
            return;
        }
        if (message.type === PHYSICS_REGISTER) {
            this.#register(message.payload, context);
            return;
        }
        if (message.type === PHYSICS_MOVE) {
            this.#requestMove(message.payload, context);
            return;
        }
        if (message.type === PHYSICS_MOVE_TO) {
            this.#requestMoveTo(message.payload, context);
            return;
        }
        if (message.type === PHYSICS_POSITION) {
            this.#reportPosition(message.payload, context);
            return;
        }
        if (message.type === PHYSICS_LIST) {
            this.#reportState(message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { bodies: this.#bodies.size, moving: this.#moves.size, speed: this.#speed };
    }

    #register(payload: unknown, context: ActorContext): void {
        const request = readRegister(payload);
        const position = request.position ?? this.#freeSpot();
        if (position === null) {
            context.log(`для «${request.id}» не нашлось места в границах мира`);
            return;
        }
        if (!this.#insideBounds(position)) {
            context.log(`точка ${formatPoint(position)} вне границ мира, тело «${request.id}» не заведено`);
            return;
        }
        this.#bodies.set(request.id, position);
        context.log(`тело «${request.id}» в точке ${formatPoint(position)}`);
    }

    #requestMove(payload: unknown, context: ActorContext): void {
        const request = readMoveRequest(payload);
        const from = this.#bodies.get(request.id);
        if (from === undefined) {
            this.#reply(request.replyTo, request.id, false, `тело «${request.id}» не зарегистрировано`, ZERO, context);
            return;
        }
        const length = Math.hypot(request.direction.x, request.direction.y, request.direction.z);
        if (length === 0) {
            this.#reply(request.replyTo, request.id, false, 'нулевое направление', from, context);
            return;
        }
        const goal = add(from, scale(request.direction, request.distance / length));
        const blocked = this.#blocked(from, goal, [request.id]);
        if (blocked !== null) {
            this.#reply(request.replyTo, request.id, false, blocked, from, context);
            return;
        }
        this.#moves.set(request.id, { kind: 'segment', goal, targetId: null, requester: request.replyTo });
        this.#reply(request.replyTo, request.id, true, null, from, context);
    }

    #requestMoveTo(payload: unknown, context: ActorContext): void {
        const request = readMoveToRequest(payload);
        const from = this.#bodies.get(request.id);
        if (from === undefined) {
            this.#reply(request.replyTo, request.id, false, `тело «${request.id}» не зарегистрировано`, ZERO, context);
            return;
        }
        const target = this.#bodies.get(request.targetId);
        if (target === undefined) {
            this.#reply(request.replyTo, request.id, false, `тело-цель «${request.targetId}» не зарегистрировано`, from, context);
            return;
        }
        const blocked = this.#blocked(from, target, [request.id, request.targetId]);
        if (blocked !== null) {
            this.#reply(request.replyTo, request.id, false, blocked, from, context);
            return;
        }
        this.#moves.set(request.id, { kind: 'pursue', goal: null, targetId: request.targetId, requester: request.replyTo });
        this.#reply(request.replyTo, request.id, true, null, from, context);
    }

    #reportPosition(payload: unknown, context: ActorContext): void {
        const request = readPositionRequest(payload);
        const position = this.#bodies.get(request.id) ?? null;
        const body: PhysicsBody | null = position === null ? null : { id: request.id, position };
        if (request.replyTo === null) {
            context.log(`спросили позицию «${request.id}» без обратного адреса`);
            return;
        }
        context.send(request.replyTo, createMessage(PHYSICS_BODY, { id: request.id, body }));
    }

    #reportState(payload: unknown, context: ActorContext): void {
        const replyTo = readReplyTo((payload as { replyTo?: unknown } | undefined)?.replyTo);
        const state: PhysicsState = {
            speed: this.#speed,
            stepSeconds: this.#stepSeconds,
            minDistance: this.#minDistance,
            arriveDistance: this.#arriveDistance,
            bounds: this.#bounds,
            bodies: [...this.#bodies.entries()].map(([id, position]) => ({ id, position })),
            moving: [...this.#moves.keys()],
        };
        if (replyTo === null) {
            context.log('спросили состояние физики без обратного адреса');
            return;
        }
        context.send(replyTo, createMessage(PHYSICS_STATE, state));
    }

    #advance(context: ActorContext): void {
        for (const [id, move] of this.#moves) {
            this.#step(id, move, context);
        }
    }

    #step(id: string, move: Move, context: ActorContext): void {
        const from = this.#bodies.get(id);
        const goal = this.#goalOf(move);
        if (from === undefined || goal === null) {
            this.#moves.delete(id);
            return;
        }
        const threshold = move.kind === 'segment' ? 0 : this.#arriveDistance;
        const distance = distanceBetween(from, goal);
        if (distance <= threshold + EPSILON) {
            this.#finish(id, move, move.kind === 'segment' ? goal : from, null, context);
            return;
        }
        const travel = Math.min(this.#speed * this.#stepSeconds, distance - threshold);
        const direction = scale(subtract(goal, from), 1 / distance);
        const next = add(from, scale(direction, travel));
        const ignore = move.targetId === null ? [id] : [id, move.targetId];
        const blocked = this.#blocked(from, next, ignore);
        if (blocked !== null) {
            this.#finish(id, move, from, blocked, context);
            return;
        }
        this.#bodies.set(id, next);
        if (distanceBetween(next, goal) <= threshold + EPSILON) {
            this.#finish(id, move, move.kind === 'segment' ? goal : next, null, context);
        }
    }

    #finish(id: string, move: Move, position: Point, reason: string | null, context: ActorContext): void {
        this.#bodies.set(id, position);
        this.#moves.delete(id);
        if (move.requester === null) {
            context.log(`тело «${id}» ${reason === null ? 'на месте' : `остановлено: ${reason}`}`);
            return;
        }
        const report: ArrivalReport = { id, position, reason };
        context.send(move.requester, createMessage(PHYSICS_ARRIVED, report));
    }
    #goalOf(move: Move): Point | null {
        if (move.kind === 'segment') {
            return move.goal;
        }
        return move.targetId === null ? null : this.#bodies.get(move.targetId) ?? null;
    }

    #blocked(from: Point, to: Point, ignore: readonly string[]): string | null {
        const length = distanceBetween(from, to);
        const samples = Math.max(1, Math.ceil(length / this.#minDistance));
        for (let index = 1; index <= samples; index += 1) {
            const ratio = index / samples;
            const point = {
                x: from.x + (to.x - from.x) * ratio,
                y: from.y + (to.y - from.y) * ratio,
                z: from.z + (to.z - from.z) * ratio,
            };
            if (!this.#insideBounds(point)) {
                return `точка ${formatPoint(point)} вне границ мира`;
            }
            const hit = this.#nearest(point, ignore);
            if (hit !== null) {
                return `на пути тело «${hit}»`;
            }
        }
        return null;
    }

    #nearest(point: Point, ignore: readonly string[]): string | null {
        for (const [id, position] of this.#bodies) {
            if (!ignore.includes(id) && distanceBetween(point, position) < this.#minDistance) {
                return id;
            }
        }
        return null;
    }

    #insideBounds(point: Point): boolean {
        const { min, max } = this.#bounds;
        return point.x >= min.x && point.x <= max.x && point.y >= min.y && point.y <= max.y && point.z >= min.z && point.z <= max.z;
    }

    #freeSpot(): Point | null {
        const { min, max } = this.#bounds;
        const counts = {
            x: Math.floor((max.x - min.x) / this.#spawnDistance),
            y: Math.floor((max.y - min.y) / this.#spawnDistance),
            z: Math.floor((max.z - min.z) / this.#spawnDistance),
        };
        for (let iz = 0; iz <= counts.z; iz += 1) {
            for (let iy = 0; iy <= counts.y; iy += 1) {
                for (let ix = 0; ix <= counts.x; ix += 1) {
                    const point = { x: min.x + ix * this.#spawnDistance, y: min.y + iy * this.#spawnDistance, z: min.z + iz * this.#spawnDistance };
                    if (this.#nearest(point, []) === null) {
                        return point;
                    }
                }
            }
        }
        return null;
    }

    #reply(replyTo: string | null, id: string, accepted: boolean, reason: string | null, position: Point, context: ActorContext): void {
        if (replyTo === null) {
            context.log(`«${id}»: ${accepted ? 'принято' : `отказано (${reason ?? ''})`}`);
            return;
        }
        const report: MoveReport = { id, accepted, reason, position };
        context.send(replyTo, createMessage(PHYSICS_REPORT, report));
    }

}
export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): PhysicsAgent {
    return new PhysicsAgent(options);
}

function readRegister(payload: unknown): { id: string; position: Point | null } {
    const candidate = payload as { id?: unknown; position?: unknown } | undefined;
    const id = readId(candidate?.id);
    return { id, position: candidate?.position === undefined ? null : readPoint(candidate.position, 'position') };
}

function readMoveRequest(payload: unknown): { id: string; direction: Point; distance: number; replyTo: string | null } {
    const candidate = payload as { id?: unknown; direction?: unknown; distance?: unknown; replyTo?: unknown } | undefined;
    return {
        id: readId(candidate?.id),
        direction: readPoint(candidate?.direction, 'direction'),
        distance: readPositive(candidate?.distance, 'distance'),
        replyTo: readReplyTo(candidate?.replyTo),
    };
}

function readMoveToRequest(payload: unknown): { id: string; targetId: string; replyTo: string | null } {
    const candidate = payload as { id?: unknown; targetId?: unknown; replyTo?: unknown } | undefined;
    return {
        id: readId(candidate?.id),
        targetId: readId(candidate?.targetId, 'тело-цель'),
        replyTo: readReplyTo(candidate?.replyTo),
    };
}

function readPositionRequest(payload: unknown): { id: string; replyTo: string | null } {
    const candidate = payload as { id?: unknown; replyTo?: unknown } | undefined;
    return { id: readId(candidate?.id), replyTo: readReplyTo(candidate?.replyTo) };
}

function readId(value: unknown, name = 'тело'): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`в сообщении нет адреса (${name})`);
    }
    return value;
}

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function readPoint(value: unknown, name: string): Point {
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    return { x: readNumber(candidate?.x, `${name}.x`), y: readNumber(candidate?.y, `${name}.y`), z: readNumber(candidate?.z, `${name}.z`) };
}

function readNumber(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${name} должен быть конечным числом`);
    }
    return value;
}

function readPositive(value: unknown, name: string): number {
    const parsed = readNumber(value, name);
    if (parsed <= 0) {
        throw new Error(`${name} должен быть положительным числом`);
    }
    return parsed;
}

function readNumberOption(value: unknown, fallback: number, name: string): number {
    return value === undefined ? fallback : readPositive(value, name);
}

function readBounds(value: unknown, fallback: Bounds): Bounds {
    if (value === undefined) {
        return fallback;
    }
    const candidate = value as { min?: unknown; max?: unknown } | undefined;
    const min = readPoint(candidate?.min, 'bounds.min');
    const max = readPoint(candidate?.max, 'bounds.max');
    if (max.x < min.x || max.y < min.y || max.z < min.z) {
        throw new Error('bounds.max должен быть не меньше bounds.min по каждой оси');
    }
    return { min, max };
}

function subtract(a: Point, b: Point): Point {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Point, b: Point): Point {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(point: Point, factor: number): Point {
    return { x: point.x * factor, y: point.y * factor, z: point.z * factor };
}

function distanceBetween(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function formatPoint(point: Point): string {
    return `(${round(point.x)}; ${round(point.y)}; ${round(point.z)})`;
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

