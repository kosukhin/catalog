/**
 * Проверки того, что PostgreSQL действительно ведёт себя так, как рассказано в
 * README. Тесты ходят в настоящую базу, поэтому нужен поднятый контейнер
 * (`npm run db:up`); если базы нет — тесты пропускаются с объяснением.
 *
 * Запуск: `npm test`.
 */

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../src/config.ts';
import { checkConnection, closePool, describeError, type IsolationLevel } from '../src/db.ts';
import { readAccount, readJournal, resetAccount } from '../src/bank.ts';
import { clearBarriers, FileBarrier } from '../src/barrier.ts';
import { transfer, type TransferResult } from '../src/transfer.ts';
import type { StrategyName } from '../src/strategies.ts';

const config = readConfig();
const barrierDir = join(tmpdir(), 'postgres-isolation-tests', String(process.pid));

/** Параметры пары одновременных проводок. */
interface PairOptions {
    readonly isolation: IsolationLevel;
    readonly strategy: StrategyName;
    /** Ждать ли второго участника в барьере — иначе гонки может и не случиться. */
    readonly useBarrier: boolean;
    /** Задержка «бизнес-логики» у списания: делает порядок записей предсказуемым. */
    readonly debitDelayMs: number;
}

/** Запускает зачисление и списание одновременно. */
async function runPair(options: PairOptions): Promise<{ credited: TransferResult; debited: TransferResult }> {
    const name = `test-${options.strategy}-${options.isolation.replaceAll(' ', '-')}`;
    await clearBarriers(barrierDir);
    const makeRequest = (agent: string, kind: string, delta: number, logicDelayMs: number) =>
        transfer({
            config,
            agent,
            kind,
            accountId: config.accountId,
            delta,
            isolation: options.isolation,
            strategy: options.strategy,
            logicDelayMs,
            barrier: options.useBarrier
                ? new FileBarrier({
                      dir: barrierDir,
                      name,
                      expected: 2,
                      timeoutMs: config.barrierTimeoutMs,
                  })
                : null,
            maxAttempts: 3,
        });
    const [credited, debited] = await Promise.all([
        makeRequest('Тест-зачисление', 'зачисление', 500, 0),
        makeRequest('Тест-списание', 'списание', -300, options.debitDelayMs),
    ]);
    return { credited, debited };
}

/** Читает баланс из базы и сбрасывает счёт перед тестом. */
async function prepare(): Promise<void> {
    await resetAccount(config, config.accountId, config.initialBalance);
}

/** Поднята ли база: без неё тесты нечего проверять. */
async function probe(): Promise<string | false> {
    try {
        await checkConnection(config);
        return false;
    } catch (error) {
        return `нет PostgreSQL (${config.databaseUrl}): ${describeError(error)}`;
    }
}

const skip = await probe();

test('READ COMMITTED: «прочитал → записал» теряет обновление', { skip }, async () => {
    await prepare();
    await runPair({
        isolation: 'read committed',
        strategy: 'read-modify-write',
        useBarrier: true,
        debitDelayMs: 60,
    });
    const account = await readAccount(config, config.accountId);
    const journal = await readJournal(config, config.accountId);
    assert.equal(account.balance, 700, 'второй UPDATE должен затереть первый');
    assert.equal(journal.length, 2);
    assert.deepEqual(
        journal.map((operation) => operation.balanceBefore),
        [config.initialBalance, config.initialBalance],
        'оба агента прочитали одно и то же значение',
    );
});

test('REPEATABLE READ: конфликт 40001 и повтор дают верный итог', { skip }, async () => {
    await prepare();
    const { debited } = await runPair({
        isolation: 'repeatable read',
        strategy: 'read-modify-write',
        useBarrier: true,
        debitDelayMs: 60,
    });
    const account = await readAccount(config, config.accountId);
    assert.equal(account.balance, config.initialBalance + 200);
    assert.equal(debited.attempts, 2, 'вторая транзакция должна быть повторена');
    assert.match(debited.conflicts[0] ?? '', /40001/);
});

test('SELECT … FOR UPDATE: очередь без повторов', { skip }, async () => {
    await prepare();
    const { credited, debited } = await runPair({
        isolation: 'read committed',
        strategy: 'for-update',
        useBarrier: false,
        debitDelayMs: 0,
    });
    const account = await readAccount(config, config.accountId);
    assert.equal(account.balance, config.initialBalance + 200);
    assert.equal(credited.attempts, 1);
    assert.equal(debited.attempts, 1);
});

test('атомарное приращение: верный итог без блокировок и повторов', { skip }, async () => {
    await prepare();
    const { debited } = await runPair({
        isolation: 'read committed',
        strategy: 'atomic',
        useBarrier: false,
        debitDelayMs: 0,
    });
    const account = await readAccount(config, config.accountId);
    assert.equal(account.balance, config.initialBalance + 200);
    assert.equal(debited.attempts, 1);
});

after(async () => {
    await clearBarriers(barrierDir);
    await closePool();
});
