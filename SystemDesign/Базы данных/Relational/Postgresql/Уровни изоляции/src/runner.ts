/**
 * Один сценарий целиком: подготовка счёта → прогон мира → чтение итога.
 *
 * Сценарий всегда начинается с одного и того же состояния (баланс 1000 ₽ и
 * пустой журнал) — иначе результаты прогонов нельзя сравнивать между собой.
 */

import type { SimulationConfig } from './config.ts';
import { readAccount, readJournal, resetAccount, type OperationRow } from './bank.ts';
import { clearBarriers } from './barrier.ts';
import { PARTICIPANTS, type Scenario } from './scenarios.ts';
import { runWorld, type AgentReport } from './world.ts';

/** Всё, что нужно, чтобы напечатать отчёт по сценарию. */
export interface ScenarioOutcome {
    readonly scenario: Scenario;
    /** Название счёта из базы: «Общий счёт Анны и Петра». */
    readonly accountTitle: string;
    readonly initialBalance: number;
    /** Правильный итог: стартовый баланс плюс все проводки. */
    readonly expectedBalance: number;
    /** Что на самом деле лежит в поле `accounts.balance`. */
    readonly finalBalance: number;
    readonly agents: readonly AgentReport[];
    readonly journal: readonly OperationRow[];
    /** Лог мира: что и в каком порядке печатали агенты в своих потоках. */
    readonly logs: readonly string[];
}

/**
 * Прогоняет один сценарий.
 *
 * @param barrierDir каталог маркеров; чистится перед прогоном, чтобы барьер
 * прошлого сценария не «пропустил» агентов мгновенно
 */
export async function runScenario(
    config: SimulationConfig,
    scenario: Scenario,
    barrierDir: string,
): Promise<ScenarioOutcome> {
    await resetAccount(config, config.accountId, config.initialBalance);
    await clearBarriers(barrierDir);
    const { reports, logs } = await runWorld({ config, scenario, barrierDir });
    const account = await readAccount(config, config.accountId);
    const journal = await readJournal(config, config.accountId);
    return {
        scenario,
        accountTitle: account.title,
        initialBalance: config.initialBalance,
        expectedBalance: config.initialBalance + totalDelta(),
        finalBalance: account.balance,
        agents: reports,
        journal,
        logs,
    };
}

/** На сколько счёт должен измениться за сценарий. */
function totalDelta(): number {
    return PARTICIPANTS.reduce((sum, participant) => sum + participant.delta, 0);
}
