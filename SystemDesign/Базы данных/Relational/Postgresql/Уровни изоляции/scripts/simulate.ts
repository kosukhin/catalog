/**
 * Точка входа: прогон всех сценариев по очереди.
 *
 * Запуск: `npm start` (или `node --env-file-if-exists=.env scripts/simulate.ts`).
 * Скрипт — единственное место, которое решает, что и в каком порядке запускать;
 * сам мир про сценарии ничего не знает.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig, type SimulationConfig } from '../src/config.ts';
import { checkConnection, closePool, describeError } from '../src/db.ts';
import { clearBarriers } from '../src/barrier.ts';
import { renderScenario, renderSummary } from '../src/report.ts';
import { runScenario, type ScenarioOutcome } from '../src/runner.ts';
import { SCENARIOS } from '../src/scenarios.ts';

/** Каталог маркеров барьера: свой у каждого запуска, чтобы прогоны не мешали друг другу. */
const barrierDir = join(tmpdir(), 'postgres-isolation-levels', String(process.pid));

async function main(): Promise<void> {
    const config = readConfig();
    await ensureDatabase(config);
    console.log(`PostgreSQL: ${config.databaseUrl}`);
    console.log(`счёт №${config.accountId} · стартовый баланс ${config.initialBalance} ₽`);

    const outcomes: ScenarioOutcome[] = [];
    for (const [index, scenario] of SCENARIOS.entries()) {
        const outcome = await runScenario(config, scenario, barrierDir);
        outcomes.push(outcome);
        console.log(renderScenario(outcome, index + 1, SCENARIOS.length));
    }
    console.log(renderSummary(outcomes));
    await clearBarriers(barrierDir);
}

/** Проверяет подключение и объясняет, что делать, если базы нет. */
async function ensureDatabase(config: SimulationConfig): Promise<void> {
    try {
        await checkConnection(config);
    } catch (error) {
        throw new Error(
            `нет подключения к PostgreSQL (${config.databaseUrl}): ${describeError(error)}\n` +
                'поднимите базу командой «npm run db:up» и повторите запуск',
        );
    }
}

try {
    await main();
} catch (error) {
    console.error(`\nошибка: ${describeError(error)}`);
    process.exitCode = 1;
} finally {
    await closePool();
}
