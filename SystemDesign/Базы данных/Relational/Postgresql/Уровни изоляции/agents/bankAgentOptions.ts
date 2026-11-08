/**
 * Разбор настроек BankAgent.
 *
 * Настройки приходят из мира как обычный объект (`options` в наряде на актора) и
 * переживают `structured clone`, поэтому доверять их форме нельзя: всё
 * проверяется здесь, а в самом агенте остаётся только работа с готовыми полями.
 */

import { DEFAULT_MAX_ATTEMPTS } from '../src/transfer.ts';
import type { StrategyName } from '../src/strategies.ts';
import type { IsolationLevel } from '../src/db.ts';

/** Что делает конкретный агент. */
export interface ParticipantOptions {
    /** Вид операции: «зачисление» или «списание». */
    readonly kind: string;
    /** На сколько меняется баланс. */
    readonly delta: number;
    /** Пауза «бизнес-логики» между чтением и записью, мс. */
    readonly logicDelayMs: number;
}

/** Настройки, которые мир передаёт в каждый экземпляр агента. */
export interface BankAgentOptions {
    /** Карта «id агента → его операция»: настройки мира общие для всего типа. */
    readonly participants: Readonly<Record<string, ParticipantOptions>>;
    readonly strategy: StrategyName;
    readonly isolation: IsolationLevel;
    readonly accountId: number;
    readonly databaseUrl: string;
    readonly initialBalance: number;
    readonly barrierTimeoutMs: number;
    readonly barrierDir: string;
    readonly barrierName: string;
    readonly maxAttempts: number;
}

/** Читает и проверяет настройки мира. */
export function readOptions(raw: Readonly<Record<string, unknown>>): BankAgentOptions {
    return {
        participants: readParticipants(raw.participants),
        strategy: readStrategy(raw.strategy),
        isolation: readIsolation(raw.isolation),
        accountId: readInteger(raw.accountId, 'accountId'),
        databaseUrl: readString(raw.databaseUrl, 'databaseUrl'),
        initialBalance: readInteger(raw.initialBalance, 'initialBalance'),
        barrierTimeoutMs: readInteger(raw.barrierTimeoutMs, 'barrierTimeoutMs'),
        barrierDir: readString(raw.barrierDir, 'barrierDir'),
        barrierName: readString(raw.barrierName, 'barrierName'),
        maxAttempts: raw.maxAttempts === undefined
            ? DEFAULT_MAX_ATTEMPTS
            : readInteger(raw.maxAttempts, 'maxAttempts'),
    };
}

/** Читает карту участников. */
function readParticipants(value: unknown): Readonly<Record<string, ParticipantOptions>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('participants должен быть объектом «id агента → операция»');
    }
    const participants: Record<string, ParticipantOptions> = {};
    for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
        if (typeof entry !== 'object' || entry === null) {
            throw new Error(`описание агента «${id}» должно быть объектом`);
        }
        const raw = entry as { kind?: unknown; delta?: unknown; logicDelayMs?: unknown };
        participants[id] = {
            kind: readString(raw.kind, `participants.${id}.kind`),
            delta: readInteger(raw.delta, `participants.${id}.delta`),
            logicDelayMs: raw.logicDelayMs === undefined
                ? 0
                : readInteger(raw.logicDelayMs, `participants.${id}.logicDelayMs`),
        };
    }
    if (Object.keys(participants).length === 0) {
        throw new Error('participants не может быть пустым');
    }
    return participants;
}

/** Читает название стратегии. */
function readStrategy(value: unknown): StrategyName {
    if (value === 'read-modify-write' || value === 'for-update' || value === 'atomic') {
        return value;
    }
    throw new Error(`strategy должна быть read-modify-write, for-update или atomic, получено ${String(value)}`);
}

/** Читает уровень изоляции. */
function readIsolation(value: unknown): IsolationLevel {
    if (value === 'read committed' || value === 'repeatable read' || value === 'serializable') {
        return value;
    }
    throw new Error(`isolation должна быть read committed, repeatable read или serializable, получено ${String(value)}`);
}

/** Читает непустую строку. */
function readString(value: unknown, name: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${name} должен быть непустой строкой`);
    }
    return value;
}

/** Читает целое число (дельты и сдвиги бывают отрицательными). */
function readInteger(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        throw new Error(`${name} должен быть целым числом, получено ${String(value)}`);
    }
    return value;
}
