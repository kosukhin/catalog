/**
 * Печать результатов: одна таблица на сценарий и сводка в конце.
 *
 * Модуль ничего не читает из базы и ничего не запускает: на вход приходит готовый
 * `ScenarioOutcome`, на выходе — строки для консоли. Так отчёт можно проверить
 * тестом, не поднимая PostgreSQL.
 */

import type { OperationRow } from './bank.ts';
import type { ScenarioOutcome } from './runner.ts';

/** Разделитель блоков. */
const LINE = '─'.repeat(78);

/** Шапка и ширины таблицы агентов. */
const AGENT_HEADER = ['агент', 'поток', 'прочитал', 'записал', 'попыток', 'статус'];
const AGENT_WIDTHS = [12, 6, 9, 8, 8, 14];

/** Шапка и ширины журнала проводок. */
const JOURNAL_HEADER = ['№', 'агент', 'вид', 'сумма', 'было', 'стало', 'изоляция'];
const JOURNAL_WIDTHS = [3, 12, 11, 7, 6, 6, 16];

/** Шапка и ширины сводки. */
const SUMMARY_HEADER = ['сценарий', 'изоляция', 'итог', 'ожидалось', 'вердикт'];
const SUMMARY_WIDTHS = [18, 17, 7, 10, 10];

/** Блок по одному сценарию. */
export function renderScenario(outcome: ScenarioOutcome, index: number, total: number): string {
    const { scenario } = outcome;
    const lines: string[] = [
        '',
        LINE,
        `Сценарий ${index}/${total}: ${scenario.title}`,
        LINE,
        `счёт: «${outcome.accountTitle}» · баланс на старте: ${money(outcome.initialBalance)}`,
        `стратегия: ${scenario.strategy} · уровень изоляции: ${scenario.isolation.toUpperCase()}`,
        `что показывает: ${scenario.goal}`,
        '',
        ...table(AGENT_HEADER, outcome.agents.map(agentRow), AGENT_WIDTHS),
    ];
    const conflicts = outcome.agents.flatMap((agent) =>
        (agent.result?.conflicts ?? []).map((conflict) => `  ${agent.id}: ${conflict}`),
    );
    if (conflicts.length > 0) {
        lines.push('', 'отменённые попытки:', ...conflicts);
    }
    lines.push('', 'лог мира (строки агентов разных потоков):', ...outcome.logs.map((line) => `  ${line}`));
    lines.push('', 'журнал проводок:', ...table(JOURNAL_HEADER, outcome.journal.map(journalRow), JOURNAL_WIDTHS));
    lines.push('', verdict(outcome));
    return lines.join('\n');
}

/** Сводка по всем сценариям: итог и совпал ли он с ожидаемым. */
export function renderSummary(outcomes: readonly ScenarioOutcome[]): string {
    const rows = outcomes.map((outcome) => [
        outcome.scenario.name,
        outcome.scenario.isolation.toUpperCase(),
        money(outcome.finalBalance),
        money(outcome.expectedBalance),
        isCorrect(outcome) ? '✅ верно' : '❌ ошибка',
    ]);
    const lines = ['', LINE, 'Итоги', LINE, ...table(SUMMARY_HEADER, rows, SUMMARY_WIDTHS), ''];
    const broken = outcomes.filter((outcome) => isCorrect(outcome) !== outcome.scenario.expectedCorrect);
    if (broken.length > 0) {
        lines.push(
            '⚠ сценарии повели себя не так, как задумано:',
            ...broken.map((outcome) => `  ${outcome.scenario.name}: итог ${money(outcome.finalBalance)}`),
            '',
        );
    }
    lines.push(
        'вывод: без изоляции и блокировки «прочитал → записал» теряет деньги молча —',
        'обе транзакции успешны, а на счёте неверная сумма. Лечится тремя способами:',
        'уровнем REPEATABLE READ с повтором по 40001, блокировкой строки (SELECT … FOR UPDATE)',
        'или атомарной командой UPDATE … SET balance = balance + delta.',
    );
    return lines.join('\n');
}

/** Строка таблицы агентов. */
function agentRow(agent: ScenarioOutcome['agents'][number]): readonly string[] {
    return [
        agent.id,
        agent.threadId === null ? '—' : String(agent.threadId),
        agent.result === null ? '—' : String(agent.result.balanceBefore),
        agent.result === null ? '—' : String(agent.result.balanceAfter),
        agent.result === null ? '—' : String(agent.result.attempts),
        statusOf(agent),
    ];
}

/** Строка журнала проводок. */
function journalRow(operation: OperationRow, index: number): readonly string[] {
    return [
        String(index + 1),
        operation.agent,
        operation.kind,
        signed(operation.amount),
        String(operation.balanceBefore),
        String(operation.balanceAfter),
        operation.isolation,
    ];
}

/** Статус агента в таблице. */
function statusOf(agent: ScenarioOutcome['agents'][number]): string {
    if (agent.error !== null) {
        return 'сбой';
    }
    return agent.result === null ? 'нет данных' : 'зафиксировано';
}

/** Итог сценария: совпал ли баланс в базе с правильным. */
function verdict(outcome: ScenarioOutcome): string {
    const tail = `итог в БД: ${money(outcome.finalBalance)} · ожидалось: ${money(outcome.expectedBalance)}`;
    if (isCorrect(outcome)) {
        return `${tail} · ✅ совпало`;
    }
    const lost = outcome.expectedBalance - outcome.finalBalance;
    const what = lost > 0 ? `потеряно ${money(lost)}` : `лишние ${money(-lost)}`;
    return `${tail} · ❌ ${what}`;
}

/** Совпал ли фактический баланс с ожидаемым. */
function isCorrect(outcome: ScenarioOutcome): boolean {
    return outcome.finalBalance === outcome.expectedBalance;
}

/** Собирает таблицу: шапка плюс строки. */
function table(
    header: readonly string[],
    rows: readonly (readonly string[])[],
    widths: readonly number[],
): string[] {
    return [format(header, widths), ...rows.map((row) => format(row, widths))];
}

/** Выравнивает строку таблицы по ширинам колонок. */
function format(cells: readonly string[], widths: readonly number[]): string {
    const line = cells
        .map((cell, index) => {
            const width = widths[index] ?? 0;
            return cell.length >= width ? cell : cell + ' '.repeat(width - cell.length);
        })
        .join(' ');
    return line.trimEnd();
}

/** Сумма со знаком: `+500`, `−300`. */
function signed(amount: number): string {
    return amount >= 0 ? `+${amount}` : `−${Math.abs(amount)}`;
}

/** Сумма с валютой: `1200 ₽`. */
function money(amount: number): string {
    return `${amount} ₽`;
}
