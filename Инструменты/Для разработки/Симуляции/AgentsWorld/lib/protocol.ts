export type ActorId = string;

export interface Message {
    readonly type: string;
    readonly payload?: unknown;
}

export interface ActorAssignment {
    readonly id: ActorId;
    readonly type: string;
    readonly moduleUrl: string;
    readonly options: Readonly<Record<string, unknown>>;
}

export type WorkerCommand =
    | { readonly kind: 'start'; readonly actors: readonly ActorAssignment[] }
    | { readonly kind: 'deliver'; readonly from: ActorId; readonly to: ActorId; readonly message: Message }
    | { readonly kind: 'stop' };

export const WORLD_ID = 'мир';

export const STATUS_REQUEST = 'status-request';

export const STATUS_REPORT = 'status-report';

export const TICK = 'tick';

export interface StatusReport {
    readonly id: ActorId;
    readonly type: string;
    readonly details: Readonly<Record<string, unknown>>;
}

export type WorkerEvent =
    | { readonly kind: 'ready'; readonly actorIds: readonly ActorId[] }
    | { readonly kind: 'deliver'; readonly from: ActorId; readonly to: ActorId; readonly message: Message }
    | { readonly kind: 'log'; readonly actorId: ActorId; readonly threadId: number; readonly text: string }
    | { readonly kind: 'error'; readonly actorId: ActorId | null; readonly text: string }
    | { readonly kind: 'done' };

export function createMessage(type: string, payload?: unknown): Message {
    if (typeof type !== 'string' || type.trim() === '') {
        throw new Error('тип сообщения должен быть непустой строкой');
    }
    return payload === undefined ? { type } : { type, payload };
}

export function isMessage(value: unknown): value is Message {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as { type?: unknown };
    return typeof candidate.type === 'string' && candidate.type.trim() !== '';
}
