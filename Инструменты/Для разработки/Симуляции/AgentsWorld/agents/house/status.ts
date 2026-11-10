import type { Point } from '../physicsAgent.ts';

export interface HouseRecord {
    readonly id: string;
    readonly owner: string;
    readonly position: Point;
}

export interface PendingPurchase {
    readonly owner: string;
    readonly replyTo: string;
}

export interface HouseStatus {
    readonly price: number;
    readonly bankId: string;
    readonly physicsId: string;
    readonly houses: Map<string, HouseRecord>;
    readonly pending: Map<string, PendingPurchase>;
}

export function readOwner(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('в покупке нет владельца (owner)');
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
