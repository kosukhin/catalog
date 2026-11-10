export type ActorId = string;

export interface Message {
    readonly type: string;
    readonly payload?: unknown;
}

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
