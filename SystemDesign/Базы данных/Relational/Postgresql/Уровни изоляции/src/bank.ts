/**
 * Операции над счётом.
 *
 * Все денежные операции принимают клиента (`PoolClient`), а не пул: они обязаны
 * выполняться внутри чужой транзакции. Пул используется только там, где нужен
 * отдельный независимый запрос — прочитать итог или сбросить счёт перед
 * сценарием.
 */

import type { PoolClient } from 'pg';
import { getPool } from './db.ts';
import type { SimulationConfig } from './config.ts';

/** Счёт так, как его видит отчёт. */
export interface Account {
    readonly title: string;
    readonly balance: number;
}

/** Строка журнала проводок. */
export interface OperationRow {
    readonly agent: string;
    readonly kind: string;
    readonly amount: number;
    readonly balanceBefore: number;
    readonly balanceAfter: number;
    readonly isolation: string;
}

/** Что агент записывает в журнал внутри своей транзакции. */
export interface OperationRecord extends OperationRow {}

/** Читает счёт отдельным запросом (вне транзакции агента). */
export async function readAccount(config: SimulationConfig, accountId: number): Promise<Account> {
    const { rows } = await getPool(config).query<Account>(
        'SELECT title, balance FROM accounts WHERE id = $1',
        [accountId],
    );
    return firstRow(rows, `счёт №${accountId}`);
}

/** Возвращает счёт в исходное состояние: баланс как в начале и пустой журнал. */
export async function resetAccount(config: SimulationConfig, accountId: number, balance: number): Promise<void> {
    const pool = getPool(config);
    await pool.query('DELETE FROM operations WHERE account_id = $1', [accountId]);
    const result = await pool.query('UPDATE accounts SET balance = $2 WHERE id = $1', [accountId, balance]);
    if (result.rowCount === 0) {
        throw new Error(`счёт №${accountId} не найден: база пуста? выполните sql/01_schema.sql и sql/02_seed.sql`);
    }
}

/**
 * Читает баланс внутри транзакции.
 *
 * Обычный `SELECT`: строка не блокируется, и второй агент может прочитать её
 * одновременно с первым. Именно это чтение и порождает потерянное обновление.
 */
export async function readBalance(client: PoolClient, accountId: number): Promise<number> {
    const { rows } = await client.query<{ balance: number }>(
        'SELECT balance FROM accounts WHERE id = $1',
        [accountId],
    );
    return firstRow(rows, `счёт №${accountId}`).balance;
}

/**
 * Читает баланс и сразу блокирует строку до конца транзакции.
 *
 * Второй агент на такой запрос встанет в очередь и получит уже новое значение —
 * ровно то, что нужно, чтобы не потерять первое обновление.
 */
export async function readBalanceForUpdate(client: PoolClient, accountId: number): Promise<number> {
    const { rows } = await client.query<{ balance: number }>(
        'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId],
    );
    return firstRow(rows, `счёт №${accountId}`).balance;
}

/** Записывает вычисленный баланс — «перезаписывает вслепую», не глядя на текущее значение. */
export async function writeBalance(client: PoolClient, accountId: number, balance: number): Promise<void> {
    await client.query('UPDATE accounts SET balance = $2 WHERE id = $1', [accountId, balance]);
}

/**
 * Прибавляет сумму к балансу одной командой.
 *
 * Здесь нет пары «прочитал → посчитал → записал»: приращение считает сама
 * PostgreSQL, поэтому гонки не возникает даже на READ COMMITTED.
 */
export async function addToBalance(
    client: PoolClient,
    accountId: number,
    delta: number,
): Promise<{ readonly before: number; readonly after: number }> {
    const { rows } = await client.query<{ before: number; after: number }>(
        `UPDATE accounts
            SET balance = balance + $2::integer
          WHERE id = $1
      RETURNING balance - $2::integer AS "before", balance AS "after"`,
        [accountId, delta],
    );
    return firstRow(rows, `счёт №${accountId}`);
}

/** Пишет проводку в журнал — в той же транзакции, что и изменение баланса. */
export async function logOperation(client: PoolClient, accountId: number, record: OperationRecord): Promise<void> {
    await client.query(
        `INSERT INTO operations (account_id, agent, kind, amount, balance_before, balance_after, isolation)
              VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            accountId,
            record.agent,
            record.kind,
            record.amount,
            record.balanceBefore,
            record.balanceAfter,
            record.isolation,
        ],
    );
}

/** Читает журнал проводок в порядке выполнения. */
export async function readJournal(config: SimulationConfig, accountId: number): Promise<OperationRow[]> {
    const { rows } = await getPool(config).query<OperationRow>(
        `SELECT agent, kind, amount,
                balance_before AS "balanceBefore",
                balance_after  AS "balanceAfter",
                isolation
           FROM operations
          WHERE account_id = $1
       ORDER BY id`,
        [accountId],
    );
    return rows;
}

/**
 * Достаёт первую строку результата.
 *
 * @throws если запрос ничего не вернул: значит, счёта нет и весь сценарий бессмыслен
 */
function firstRow<T>(rows: readonly T[], what: string): T {
    const row = rows[0];
    if (row === undefined) {
        throw new Error(`${what} не найден`);
    }
    return row;
}
