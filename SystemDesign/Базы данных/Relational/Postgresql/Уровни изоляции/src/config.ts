/**
 * Настройки прогона.
 *
 * Всё, что можно изменить без правки кода, берётся из окружения. Значения по
 * умолчанию совпадают с `docker-compose.yml` и `.env`, поэтому после `npm run
 * db:up` пример запускается одной командой.
 */

/** Настройки, которые нужны примеру. */
export interface SimulationConfig {
    /** Строка подключения к PostgreSQL. */
    readonly databaseUrl: string;
    /** Номер общего счёта, за который соревнуются агенты. */
    readonly accountId: number;
    /** Баланс счёта в начале каждого сценария, ₽. */
    readonly initialBalance: number;
    /** Сколько ждать, пока оба агента дойдут до барьера, мс. */
    readonly barrierTimeoutMs: number;
}

/** Строка подключения по умолчанию: пользователь, пароль и база из `.env`. */
export const DEFAULT_DATABASE_URL = 'postgres://bank:bank@localhost:5433/bank';

/** Баланс, с которого начинается каждый сценарий. */
const DEFAULT_INITIAL_BALANCE = 1000;

/** Терпение барьера: столько ждём второго агента, прежде чем объявить сбой. */
const DEFAULT_BARRIER_TIMEOUT_MS = 10_000;

/**
 * Читает настройки из окружения.
 *
 * @param env переменные окружения; в тестах подменяются обычным объектом
 * @throws если число задано не целым или отрицательным
 */
export function readConfig(env: Record<string, string | undefined> = process.env): SimulationConfig {
    return {
        databaseUrl: readText(env.DATABASE_URL, DEFAULT_DATABASE_URL),
        accountId: readInteger(env.ACCOUNT_ID, 1, 'ACCOUNT_ID'),
        initialBalance: readInteger(env.INITIAL_BALANCE, DEFAULT_INITIAL_BALANCE, 'INITIAL_BALANCE'),
        barrierTimeoutMs: readInteger(env.BARRIER_TIMEOUT_MS, DEFAULT_BARRIER_TIMEOUT_MS, 'BARRIER_TIMEOUT_MS'),
    };
}

/** Читает непустую строку. */
function readText(value: string | undefined, fallback: string): string {
    if (value === undefined || value.trim() === '') {
        return fallback;
    }
    return value;
}

/** Читает целое неотрицательное число. */
function readInteger(value: string | undefined, fallback: number, name: string): number {
    if (value === undefined || value.trim() === '') {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
        throw new Error(`${name} должен быть целым неотрицательным числом, получено «${value}»`);
    }
    return parsed;
}
