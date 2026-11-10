import type { Point } from '../physicsAgent.ts';

export interface ToiletStatus {
    readonly minutes: number;
    readonly position: Point;
    readonly physicsId: string;
    readonly dayId: string;
    readonly walking: Set<string>;
    readonly queue: string[];
    readonly distances: Map<string, number>;
    occupant: string | null;
    enteredAt: number | null;
    choosing: Set<string> | null;
    justLeft: string | null;
}

export function readId(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('в сообщении нет адреса человека (id)');
    }
    return value;
}

export function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function readText(value: unknown, fallback: string, name: string): string {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${name} должен быть непустой строкой`);
    }
    return value;
}

export function readPositiveOption(value: unknown, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} должен быть положительным числом`);
    }
    return value;
}

export function readPoint(value: unknown, fallback: Point): Point {
    if (value === undefined) {
        return fallback;
    }
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    if (typeof candidate?.x !== 'number' || typeof candidate.y !== 'number' || typeof candidate.z !== 'number') {
        throw new Error('position должен быть точкой {x, y, z} с числами');
    }
    return { x: candidate.x, y: candidate.y, z: candidate.z };
}

export function readPositionOrNull(value: unknown): Point | null {
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    if (typeof candidate?.x !== 'number' || typeof candidate.y !== 'number' || typeof candidate.z !== 'number') {
        return null;
    }
    return { x: candidate.x, y: candidate.y, z: candidate.z };
}

export function distanceBetween(from: Point, to: Point): number {
    return Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
}

export function round(value: number): number {
    return Math.round(value * 100) / 100;
}
