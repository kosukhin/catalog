/**
 * Неповторяющееся чтение: одна транзакция читает одну и ту же строку дважды.
 *
 * Здесь не нужны агенты — достаточно двух независимых сессий, и видно главное
 * различие уровней:
 *
 * - READ COMMITTED — каждая команда видит снимок, зафиксированный до её начала,
 *   поэтому второе чтение возвращает уже новое значение (неповторяющееся чтение);
 * - REPEATABLE READ — снимок берётся один раз на всю транзакцию, поэтому оба
 *   чтения возвращают одинаковое число.
 *
 * Запуск: `npm run levels`.
 */

import { readConfig } from '../src/config.ts';
import { withTransaction, closePool, describeError, type IsolationLevel } from '../src/db.ts';
import { addToBalance, readBalance, resetAccount } from '../src/bank.ts';

/** Уровни, которые сравниваем. */
const LEVELS: readonly IsolationLevel[] = ['read committed', 'repeatable read'];

/** Сколько денег зачисляет «другая сессия» между двумя чтениями. */
const DEPOSIT = 500;

async function main(): Promise<void> {
    const config = readConfig();
    for (const isolation of LEVELS) {
        await resetAccount(config, config.accountId, config.initialBalance);
        const [first, second] = await withTransaction({ config, isolation }, async (client) => {
            const before = await readBalance(client, config.accountId);
            // Пока наша транзакция открыта, другая сессия зачисляет деньги и коммитит.
            await withTransaction({ config, isolation: 'read committed' }, async (other) => {
                await addToBalance(other, config.accountId, DEPOSIT);
            });
            const after = await readBalance(client, config.accountId);
            return [before, after] as const;
        });
        const repeated = first === second;
        console.log(
            `${isolation.toUpperCase().padEnd(16)} первое чтение: ${first} ₽ · второе чтение: ${second} ₽ · ` +
                (repeated ? 'значение повторилось (снимок держится)' : `значение изменилось (+${DEPOSIT} ₽ от чужого COMMIT)`),
        );
    }
    console.log('');
    console.log('вывод: READ COMMITTED не обещает, что два одинаковых SELECT внутри одной');
    console.log('транзакции вернут одно и то же; REPEATABLE READ обещает — но за это');
    console.log('приходится расплачиваться ошибками 40001 при попытке записи (см. npm start).');
}

try {
    await main();
} catch (error) {
    console.error(`\nошибка: ${describeError(error)}`);
    process.exitCode = 1;
} finally {
    await closePool();
}
