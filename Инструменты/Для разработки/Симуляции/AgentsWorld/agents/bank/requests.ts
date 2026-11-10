import type { ChargeRequest } from './accounts.ts';

export interface OwnerRequest {
    readonly owner: string;
    readonly replyTo: string | null;
}

export function readOwnerRequest(payload: unknown): OwnerRequest {
    const candidate = payload as { owner?: unknown; replyTo?: unknown } | undefined;
    return { owner: readOwner(candidate?.owner), replyTo: readReplyTo(candidate?.replyTo) };
}

export function readChargeRequest(payload: unknown): ChargeRequest {
    const candidate = payload as { owner?: unknown; amount?: unknown; replyTo?: unknown } | undefined;
    return { owner: readOwner(candidate?.owner), amount: readPositive(candidate?.amount, 'amount'), replyTo: readReplyTo(candidate?.replyTo) };
}

export function readPositiveOption(value: unknown, fallback: number, name: string): number {
    return value === undefined ? fallback : readPositive(value, name);
}

function readOwner(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('в сообщении нет владельца счёта (owner)');
    }
    return value;
}

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function readPositive(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} должен быть положительным числом`);
    }
    return value;
}
