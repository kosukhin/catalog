import type { Bounds, Point } from './types.ts';

export function readId(value: unknown, name = 'тело'): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`в сообщении нет адреса (${name})`);
    }
    return value;
}

export function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function readPoint(value: unknown, name: string): Point {
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    return { x: readNumber(candidate?.x, `${name}.x`), y: readNumber(candidate?.y, `${name}.y`), z: readNumber(candidate?.z, `${name}.z`) };
}

export function readPositive(value: unknown, name: string): number {
    const parsed = readNumber(value, name);
    if (parsed <= 0) {
        throw new Error(`${name} должен быть положительным числом`);
    }
    return parsed;
}

export function readNumberOption(value: unknown, fallback: number, name: string): number {
    return value === undefined ? fallback : readPositive(value, name);
}

export function readBounds(value: unknown, fallback: Bounds): Bounds {
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

export function readRegister(payload: unknown): { id: string; position: Point | null } {
    const candidate = payload as { id?: unknown; position?: unknown } | undefined;
    return { id: readId(candidate?.id), position: candidate?.position === undefined ? null : readPoint(candidate.position, 'position') };
}

export function readPlaceRequest(payload: unknown): { id: string; position: Point } {
    const candidate = payload as { id?: unknown; position?: unknown } | undefined;
    return { id: readId(candidate?.id), position: readPoint(candidate?.position, 'position') };
}

export function readMoveRequest(payload: unknown): { id: string; direction: Point; distance: number; replyTo: string | null } {
    const candidate = payload as { id?: unknown; direction?: unknown; distance?: unknown; replyTo?: unknown } | undefined;
    return {
        id: readId(candidate?.id),
        direction: readPoint(candidate?.direction, 'direction'),
        distance: readPositive(candidate?.distance, 'distance'),
        replyTo: readReplyTo(candidate?.replyTo),
    };
}

export function readMoveToRequest(payload: unknown): { id: string; targetId: string; replyTo: string | null } {
    const candidate = payload as { id?: unknown; targetId?: unknown; replyTo?: unknown } | undefined;
    return { id: readId(candidate?.id), targetId: readId(candidate?.targetId, 'тело-цель'), replyTo: readReplyTo(candidate?.replyTo) };
}

export function readPositionRequest(payload: unknown): { id: string; replyTo: string | null } {
    const candidate = payload as { id?: unknown; replyTo?: unknown } | undefined;
    return { id: readId(candidate?.id), replyTo: readReplyTo(candidate?.replyTo) };
}

function readNumber(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${name} должен быть конечным числом`);
    }
    return value;
}
