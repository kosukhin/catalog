/**
 * Проводка денег с повторами.
 *
 * На REPEATABLE READ и SERIALIZABLE PostgreSQL не «портит» данные молча, а
 * отменяет транзакцию с кодом 40001 (`could not serialize access due to
 * concurrent update`). Это не сбой приложения, а сигнал «повтори на свежем
 * снимке»: поэтому решение о повторе принимается здесь, а не в стратегии.
 *
 * На READ COMMITTED конфликтов не бывает вовсе — и потерянное обновление
 * проходит незамеченным. Ровно это и показывает первый сценарий.
 */

import { conflictCode, describeError } from './db.ts';
import { STRATEGIES, type StrategyContext, type StrategyName } from './strategies.ts';
import { sleep } from './sleep.ts';

/** Сколько попыток делать по умолчанию. */
export const DEFAULT_MAX_ATTEMPTS = 3;

/** Базовая пауза перед повтором: растёт с номером попытки. */
const RETRY_PAUSE_MS = 20;

/** Запрос на проводку. */
export interface TransferRequest extends StrategyContext {
    readonly strategy: StrategyName;
    /** Сколько раз пробовать, если PostgreSQL отвечает конфликтом. */
    readonly maxAttempts: number;
}

/** Итог успешной проводки. */
export interface TransferResult {
    readonly status: 'committed';
    /** Сколько попыток понадобилось: больше одной — были конфликты. */
    readonly attempts: number;
    readonly balanceBefore: number;
    readonly balanceAfter: number;
    /** Конфликты отменённых попыток: код PostgreSQL и текст ошибки. */
    readonly conflicts: readonly string[];
}

/**
 * Проводит операцию выбранной стратегией.
 *
 * @throws если PostgreSQL вернул ошибку, которую повтором не исправить, или если
 * конфликты не закончились за `maxAttempts`
 */
export async function transfer(request: TransferRequest): Promise<TransferResult> {
    const body = STRATEGIES[request.strategy];
    const conflicts: string[] = [];
    for (let attempt = 1; attempt <= request.maxAttempts; attempt += 1) {
        try {
            const { balanceBefore, balanceAfter } = await body(request);
            return { status: 'committed', attempts: attempt, balanceBefore, balanceAfter, conflicts };
        } catch (error) {
            const code = conflictCode(error);
            if (code === null) {
                throw error;
            }
            conflicts.push(`попытка ${attempt}: ${code} — ${describeError(error)}`);
            await sleep(RETRY_PAUSE_MS * attempt);
        }
    }
    throw new Error(
        `не удалось провести «${request.kind}» за ${request.maxAttempts} попыток: ${conflicts.join('; ')}`,
    );
}
