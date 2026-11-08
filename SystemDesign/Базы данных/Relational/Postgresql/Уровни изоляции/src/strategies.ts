/**
 * Три способа провести одну и ту же операцию над счётом.
 *
 * Разница между ними — в том, что происходит между чтением баланса и его
 * записью. От этого и зависит, потеряется ли обновление при одновременной
 * работе двух агентов.
 */

import type { SimulationConfig } from './config.ts';
import { withTransaction, type IsolationLevel } from './db.ts';
import {
    addToBalance,
    logOperation,
    readBalance,
    readBalanceForUpdate,
    writeBalance,
    type OperationRecord,
} from './bank.ts';
import { sleep } from './sleep.ts';
import type { FileBarrier } from './barrier.ts';

/** Названия стратегий: под ними они указываются в сценариях. */
export type StrategyName = 'read-modify-write' | 'for-update' | 'atomic';

/** Всё, что нужно одной попытке проводки. */
export interface StrategyContext {
    readonly config: SimulationConfig;
    /** Кто выполняет операцию: `BankAgent-1`, `BankAgent-2`, … */
    readonly agent: string;
    /** Вид операции: «зачисление» или «списание». */
    readonly kind: string;
    readonly accountId: number;
    /** На сколько меняется баланс: `+500` или `-300`. */
    readonly delta: number;
    readonly isolation: IsolationLevel;
    /** Пауза «бизнес-логики» между чтением и записью, мс. */
    readonly logicDelayMs: number;
    /** Точка встречи агентов; `null` — стратегия в ней не нуждается. */
    readonly barrier: FileBarrier | null;
}

/** Что получилось из одной попытки. */
export interface Attempt {
    /** Баланс, который агент прочитал (или получил от PostgreSQL). */
    readonly balanceBefore: number;
    /** Баланс, который агент записал. */
    readonly balanceAfter: number;
}

/** Тело стратегии: одна транзакция от BEGIN до COMMIT. */
export type Strategy = (context: StrategyContext) => Promise<Attempt>;

/** Все стратегии по названиям. */
export const STRATEGIES: Readonly<Record<StrategyName, Strategy>> = {
    'read-modify-write': readModifyWrite,
    'for-update': forUpdate,
    'atomic': atomic,
};

/**
 * «Прочитал → посчитал в приложении → записал готовое число».
 *
 * Так пишет большинство прикладного кода, и это самая частая причина потерянных
 * обновлений: на READ COMMITTED обычный SELECT не блокирует строку, поэтому оба
 * агента читают 1000, считают каждый своё и записывают результат целиком. Второй
 * UPDATE затирает первый, хотя обе транзакции «успешны».
 *
 * На REPEATABLE READ тот же код уже не молчит: второй UPDATE получает ошибку
 * 40001, и транзакцию нужно повторить (см. `src/transfer.ts`).
 */
async function readModifyWrite(context: StrategyContext): Promise<Attempt> {
    return withTransaction({ config: context.config, isolation: context.isolation }, async (client) => {
        const balanceBefore = await readBalance(client, context.accountId);
        if (context.barrier !== null) {
            await context.barrier.wait(context.agent);
        }
        if (context.logicDelayMs > 0) {
            await sleep(context.logicDelayMs);
        }
        const balanceAfter = balanceBefore + context.delta;
        await writeBalance(client, context.accountId, balanceAfter);
        await logOperation(client, context.accountId, recordOf(context, balanceBefore, balanceAfter));
        return { balanceBefore, balanceAfter };
    });
}

/**
 * «Прочитал с блокировкой → записал».
 *
 * `SELECT … FOR UPDATE` вешает на строку блокировку до конца транзакции: второй
 * агент ждёт COMMIT первого и читает уже новое значение. Гонки нет, повторов не
 * нужно, но строка занята на всё время транзакции.
 */
async function forUpdate(context: StrategyContext): Promise<Attempt> {
    return withTransaction({ config: context.config, isolation: context.isolation }, async (client) => {
        const balanceBefore = await readBalanceForUpdate(client, context.accountId);
        const balanceAfter = balanceBefore + context.delta;
        await writeBalance(client, context.accountId, balanceAfter);
        await logOperation(client, context.accountId, recordOf(context, balanceBefore, balanceAfter));
        return { balanceBefore, balanceAfter };
    });
}

/**
 * «Прибавил одной командой».
 *
 * `balance = balance + delta` не оставляет окна между чтением и записью:
 * приращение считает сама PostgreSQL под блокировкой строки, поэтому результат
 * верен даже на READ COMMITTED. Для денег это самый дешёвый и надёжный способ —
 * если, конечно, бизнес-логика не требует прочитать баланс до изменения.
 */
async function atomic(context: StrategyContext): Promise<Attempt> {
    return withTransaction({ config: context.config, isolation: context.isolation }, async (client) => {
        const { before, after } = await addToBalance(client, context.accountId, context.delta);
        await logOperation(client, context.accountId, recordOf(context, before, after));
        return { balanceBefore: before, balanceAfter: after };
    });
}

/** Собирает запись журнала из контекста попытки. */
function recordOf(context: StrategyContext, before: number, after: number): OperationRecord {
    return {
        agent: context.agent,
        kind: context.kind,
        amount: context.delta,
        balanceBefore: before,
        balanceAfter: after,
        isolation: context.isolation,
    };
}
