/**
 * Подключение к PostgreSQL и транзакции.
 *
 * Пул создаётся лениво и один на поток: агенты agents-world живут в разных
 * потоках ОС, у каждого свой модуль, поэтому и пул у каждого свой. Соединение
 * открывается при первом обращении, а закрывается в `stop()` агента — иначе
 * поток не завершится, пока висят открытые сокеты.
 */

import pg from 'pg';
import type { Pool, PoolClient, PoolConfig } from 'pg';
import type { SimulationConfig } from './config.ts';

/** Уровни изоляции, которые поддерживает PostgreSQL (BEGIN ISOLATION LEVEL …). */
export type IsolationLevel = 'read committed' | 'repeatable read' | 'serializable';

/** Сколько соединений держать в пуле: двум агентам и отчёту хватает с запасом. */
const POOL_SIZE = 4;

/**
 * CJS-модуль `pg` не отдаёт именованных экспортов в ESM (`module.exports` — это
 * экземпляр класса), поэтому конструктор достаём из default-импорта.
 */
const PoolConstructor = (pg as unknown as { Pool: new (config: PoolConfig) => Pool }).Pool;

/** `BEGIN` для каждого уровня: подставлять значение параметром SQL не разрешает. */
const BEGIN: Readonly<Record<IsolationLevel, string>> = {
    'read committed': 'BEGIN ISOLATION LEVEL READ COMMITTED',
    'repeatable read': 'BEGIN ISOLATION LEVEL REPEATABLE READ',
    'serializable': 'BEGIN ISOLATION LEVEL SERIALIZABLE',
};

/** Пул текущего потока. */
let pool: Pool | null = null;

/** Отдаёт пул текущего потока, создавая его при первом обращении. */
export function getPool(config: SimulationConfig): Pool {
    if (pool === null) {
        pool = new PoolConstructor({
            connectionString: config.databaseUrl,
            max: POOL_SIZE,
            application_name: 'isolation-levels',
        });
    }
    return pool;
}

/** Закрывает пул текущего потока: без этого поток не завершится. */
export async function closePool(): Promise<void> {
    const current = pool;
    pool = null;
    if (current !== null) {
        await current.end();
    }
}

/** Проверяет, что база доступна: нужна для понятного сообщения вместо стека. */
export async function checkConnection(config: SimulationConfig): Promise<void> {
    await getPool(config).query('SELECT 1');
}

/** Параметры транзакции. */
export interface TransactionOptions {
    readonly config: SimulationConfig;
    readonly isolation: IsolationLevel;
}

/**
 * Выполняет работу в транзакции с заданным уровнем изоляции.
 *
 * Уровень задаётся при `BEGIN`, а не через `SET TRANSACTION`, — так его нельзя
 * случайно поменять посреди транзакции. При любой ошибке в `work` выполняется
 * `ROLLBACK`, а ошибка уходит вызывающему: решение «повторить или упасть»
 * принимает не транзакция, а стратегия проводки (`src/transfer.ts`).
 */
export async function withTransaction<T>(
    options: TransactionOptions,
    work: (client: PoolClient) => Promise<T>,
): Promise<T> {
    const client = await getPool(options.config).connect();
    try {
        await client.query(BEGIN[options.isolation]);
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await rollbackQuietly(client);
        throw error;
    } finally {
        client.release();
    }
}

/** Код ошибки PostgreSQL, если транзакцию имеет смысл повторить. */
export function conflictCode(error: unknown): string | null {
    const code = (error as { code?: unknown } | null)?.code;
    if (code === '40001' || code === '40P01') {
        return code;
    }
    return null;
}

/** Текст ошибки для журнала и отчёта. */
export function describeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

/** Откат, который не затирает исходную ошибку: если соединение уже мертво — молчим. */
async function rollbackQuietly(client: PoolClient): Promise<void> {
    try {
        await client.query('ROLLBACK');
    } catch {
        // Транзакция уже прервана или соединение закрыто — исходная ошибка важнее.
    }
}
