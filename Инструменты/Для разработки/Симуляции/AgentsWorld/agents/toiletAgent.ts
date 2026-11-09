import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, TICK, type Message } from '../lib/protocol.ts';
import { DAY_AGENT_ID, TIME_REQUEST, TIME_REPORT } from './dayAgent.ts';
import { PHYSICS_AGENT_ID, PHYSICS_BODY, PHYSICS_POSITION, PHYSICS_REGISTER, type Point } from './physicsAgent.ts';

const AGENT_TYPE = 'ToiletAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const TOILET_AGENT_ID = 'ToiletAgent-1';

export const TOILET_REQUEST = 'toilet-request';

export const TOILET_GRANTED = 'toilet-granted';

export const TOILET_QUEUED = 'toilet-queued';

export const TOILET_ENTER = 'toilet-enter';

export const TOILET_LEAVE = 'toilet-leave';

export const TOILET_RELEASED = 'toilet-released';

const DEFAULT_MINUTES = 20;

const DEFAULT_POSITION: Point = { x: 0, y: 50, z: 0 };

export class ToiletAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #minutes: number;
    readonly #position: Point;
    readonly #physicsId: string;
    readonly #dayId: string;
    readonly #walking = new Set<string>();
    readonly #queue: string[] = [];
    readonly #distances = new Map<string, number>();
    #occupant: string | null = null;
    #enteredAt: number | null = null;
    #choosing: Set<string> | null = null;
    #justLeft: string | null = null;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#minutes = readPositiveOption(options.minutes, DEFAULT_MINUTES, 'minutes');
        this.#position = readPoint(options.position, DEFAULT_POSITION);
        this.#physicsId = readText(options.physicsId, PHYSICS_AGENT_ID, 'physicsId');
        this.#dayId = readText(options.dayId, DAY_AGENT_ID, 'dayId');
    }

    get minutes(): number {
        return this.#minutes;
    }

    get occupant(): string | null {
        return this.#occupant;
    }

    get queueLength(): number {
        return this.#queue.length;
    }

    start(context: ActorContext): void {
        context.log(`туалет на ${this.#minutes} игровых минут, одно место`);
        context.send(this.#physicsId, createMessage(PHYSICS_REGISTER, { id: TOILET_AGENT_ID, position: this.#position }));
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === TICK) {
            if (this.#occupant !== null) {
                this.#askTime(context);
            }
            return;
        }
        if (message.type === TOILET_REQUEST) {
            this.#request(message.payload, context);
            return;
        }
        if (message.type === TOILET_ENTER) {
            this.#enter(message.payload, context);
            return;
        }
        if (message.type === TOILET_LEAVE) {
            this.#leave(message.payload, context);
            return;
        }
        if (message.type === PHYSICS_BODY) {
            this.#onPosition(message.payload, context);
            return;
        }
        if (message.type === TIME_REPORT) {
            this.#onTime(message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return { minutes: this.#minutes, occupant: this.#occupant, queue: this.#queue.length };
    }

    #request(payload: unknown, context: ActorContext): void {
        const candidate = payload as { id?: unknown; replyTo?: unknown } | undefined;
        const id = readId(candidate?.id);
        const replyTo = readReplyTo(candidate?.replyTo);
        if (replyTo === null) {
            context.log('просят туалет без обратного адреса');
            return;
        }
        if (!this.#queue.includes(id)) {
            this.#queue.push(id);
        }
        context.send(replyTo, createMessage(TOILET_QUEUED, { id, position: this.#queue.indexOf(id) + 1 }));
        this.#choose(context);
    }

    #choose(context: ActorContext): void {
        if (this.#occupant !== null || this.#walking.size > 0 || this.#choosing !== null) {
            return;
        }
        const candidates = this.#queue.filter((id) => id !== this.#justLeft);
        if (candidates.length === 0) {
            return;
        }
        this.#choosing = new Set(candidates);
        this.#distances.clear();
        for (const id of this.#choosing) {
            context.send(this.#physicsId, createMessage(PHYSICS_POSITION, { id, replyTo: TOILET_AGENT_ID }));
        }
    }

    #onPosition(payload: unknown, context: ActorContext): void {
        const report = payload as { id?: unknown; body?: unknown } | undefined;
        const id = typeof report?.id === 'string' ? report.id : null;
        if (id === null || this.#choosing === null || !this.#choosing.has(id)) {
            return;
        }
        this.#choosing.delete(id);
        const body = report?.body as { position?: unknown } | null | undefined;
        const position = body === null || body === undefined ? null : readPositionOrNull(body.position);
        this.#distances.set(id, position === null ? Number.POSITIVE_INFINITY : distanceBetween(position, this.#position));
        if (this.#choosing.size === 0) {
            this.#grantNearest(context);
        }
    }

    #grantNearest(context: ActorContext): void {
        this.#choosing = null;
        let winner: string | null = null;
        let best = Number.POSITIVE_INFINITY;
        for (const [id, distance] of this.#distances) {
            if (distance < best) {
                winner = id;
                best = distance;
            }
        }
        this.#distances.clear();
        if (winner === null || !Number.isFinite(best)) {
            context.log('желающих не нашлось в пространстве, место пока свободно');
            return;
        }
        this.#walking.add(winner);
        this.#dropFromQueue(winner);
        this.#justLeft = null;
        context.log(`${winner} ближе всех (${round(best)}), место его`);
        context.send(winner, createMessage(TOILET_GRANTED, { id: winner }));
    }

    #enter(payload: unknown, context: ActorContext): void {
        const id = readId((payload as { id?: unknown } | undefined)?.id);
        if (this.#occupant !== null) {
            context.log(`${id} не поместился: туалет занят`);
            return;
        }
        this.#walking.delete(id);
        this.#dropFromQueue(id);
        this.#occupant = id;
        this.#enteredAt = null;
        this.#askTime(context);
    }

    #leave(payload: unknown, context: ActorContext): void {
        const id = readId((payload as { id?: unknown } | undefined)?.id);
        if (this.#occupant === id) {
            this.#release(context);
            return;
        }
        this.#walking.delete(id);
        this.#dropFromQueue(id);
        context.log(`${id} передумал`);
    }

    #askTime(context: ActorContext): void {
        context.send(this.#dayId, createMessage(TIME_REQUEST, { replyTo: TOILET_AGENT_ID }));
    }

    #onTime(payload: unknown, context: ActorContext): void {
        if (this.#occupant === null) {
            return;
        }
        const report = payload as { iso?: unknown } | undefined;
        const now = typeof report?.iso === 'string' ? Date.parse(report.iso) : Number.NaN;
        if (!Number.isFinite(now)) {
            return;
        }
        if (this.#enteredAt === null) {
            this.#enteredAt = now;
            return;
        }
        if ((now - this.#enteredAt) / 60_000 >= this.#minutes) {
            context.log(`${this.#occupant} провёл ${this.#minutes} игровых минут`);
            this.#release(context);
        }
    }

    #release(context: ActorContext): void {
        const who = this.#occupant;
        if (who === null) {
            return;
        }
        this.#occupant = null;
        this.#enteredAt = null;
        this.#justLeft = who;
        context.send(who, createMessage(TOILET_RELEASED, { id: who }));
        context.log(`${who} освободил место`);
        this.#choose(context);
    }

    #dropFromQueue(id: string): void {
        const index = this.#queue.indexOf(id);
        if (index >= 0) {
            this.#queue.splice(index, 1);
        }
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): ToiletAgent {
    return new ToiletAgent(options);
}

function readId(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('в сообщении нет адреса агента (id)');
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

function readPoint(value: unknown, fallback: Point): Point {
    if (value === undefined) {
        return fallback;
    }
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    return {
        x: readCoordinate(candidate?.x, 'position.x'),
        y: readCoordinate(candidate?.y, 'position.y'),
        z: readCoordinate(candidate?.z, 'position.z'),
    };
}

function readCoordinate(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${name} должен быть конечным числом`);
    }
    return value;
}

function readPositionOrNull(value: unknown): Point | null {
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    const x = candidate?.x;
    const y = candidate?.y;
    const z = candidate?.z;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
        return null;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }
    return { x, y, z };
}

function distanceBetween(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

