/**
 * Сборка и запуск мира agents-world для одного сценария.
 *
 * Мир состоит из двух агентов одного типа — оба работают с общим счётом. Мир
 * распределяет их по потокам ОС по кругу, поэтому при `threadPoolSize: 2` каждый
 * агент получает свой поток и своё соединение с базой: транзакции действительно
 * идут параллельно, а не по очереди в одном событийном цикле.
 *
 * Результаты забираются штатным протоколом: у любого актора можно спросить
 * состояние сообщением `status-request`, агент отвечает тем, что вернул его
 * `describe()`.
 */

import { World, createMessage } from 'agents-world';
import { STATUS_REQUEST, WORLD_ID, type StatusReport } from 'agents-world/lib/protocol.ts';
import * as agents from '../agents/index.ts';
import { PARTICIPANTS, type Participant, type Scenario } from './scenarios.ts';
import type { SimulationConfig } from './config.ts';
import type { TransferResult } from './transfer.ts';

/** Что удалось узнать у одного агента после прогона. */
export interface AgentReport {
    readonly id: string;
    readonly kind: string;
    readonly delta: number;
    /** Номер потока ОС: если у агентов он разный, они правда работали параллельно. */
    readonly threadId: number | null;
    readonly result: TransferResult | null;
    readonly error: string | null;
}

/** Итог прогона мира: отчёты агентов и их лог. */
export interface WorldRunResult {
    readonly reports: readonly AgentReport[];
    /** Строки, которые агенты написали в лог мира: видно порядок и номера потоков. */
    readonly logs: readonly string[];
}

/** Что нужно миру для одного прогона. */
export interface WorldRunOptions {
    readonly config: SimulationConfig;
    readonly scenario: Scenario;
    /** Каталог маркеров барьера: общий для агентов всех потоков. */
    readonly barrierDir: string;
}

/**
 * Запускает мир, дожидается обеих операций и возвращает отчёты агентов.
 *
 * `world.run()` возвращается, когда оба потока сообщили о готовности, а агент
 * выполняет свою проводку прямо в `start()` — значит, к этому моменту обе
 * транзакции уже завершены и можно читать их итоги.
 *
 * Лог мира не печатается сразу, а копится: иначе строки агентов из разных
 * потоков перемешались бы с таблицами отчёта.
 */
export async function runWorld(options: WorldRunOptions): Promise<WorldRunResult> {
    const { config, scenario, barrierDir } = options;
    const participants = Object.fromEntries(
        PARTICIPANTS.map((participant) => [
            participant.id,
            { kind: participant.kind, delta: participant.delta, logicDelayMs: participant.logicDelayMs },
        ]),
    );
    const logs: string[] = [];
    const world = new World(
        new Map([
            [
                agents.bankAgent,
                {
                    count: PARTICIPANTS.length,
                    options: {
                        participants,
                        strategy: scenario.strategy,
                        isolation: scenario.isolation,
                        accountId: config.accountId,
                        databaseUrl: config.databaseUrl,
                        initialBalance: config.initialBalance,
                        barrierTimeoutMs: config.barrierTimeoutMs,
                        barrierDir,
                        barrierName: `barrier-${scenario.name}`,
                    },
                },
            ],
        ]),
        {
            threadPoolSize: PARTICIPANTS.length,
            print: (line: string): void => {
                logs.push(line);
            },
        },
    );

    await world.run();
    const reports: AgentReport[] = [];
    for (const participant of PARTICIPANTS) {
        const answer = await world.ask(participant.id, createMessage(STATUS_REQUEST, { replyTo: WORLD_ID }));
        reports.push(readReport(participant, answer.payload));
    }
    await world.stop();
    return { reports, logs };
}

/** Достаёт из ответа агента то, что нужно отчёту. */
function readReport(participant: Participant, payload: unknown): AgentReport {
    const details = (payload as StatusReport | undefined)?.details as
        | { threadId?: unknown; result?: unknown; error?: unknown }
        | undefined;
    return {
        id: participant.id,
        kind: participant.kind,
        delta: participant.delta,
        threadId: typeof details?.threadId === 'number' ? details.threadId : null,
        result: (details?.result ?? null) as TransferResult | null,
        error: typeof details?.error === 'string' ? details.error : null,
    };
}
