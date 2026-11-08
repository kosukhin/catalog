/**
 * BankAgent — владелец общего счёта в мире agents-world.
 *
 * Каждый агент живёт в отдельном потоке ОС (agents-world распределяет акторов по
 * пулу потоков) и держит собственное соединение с PostgreSQL. Свою операцию он
 * выполняет в `start()`, то есть сразу после появления в мире: оба агента
 * стартуют одновременно, а точку встречи после чтения баланса им даёт
 * `FileBarrier` — иначе гонка воспроизводилась бы через раз.
 *
 * Роль агента определяется его id: настройки в agents-world задаются на тип, а
 * не на экземпляр, поэтому карта «id агента → операция» приходит в
 * `options.participants`.
 *
 * Контракт модуля агента (`type`, `moduleUrl`, `createAgent`) — из библиотеки
 * agents-world, см. `Инструменты/Для разработки/Симуляции/AgentsWorld`.
 */

import { threadId } from 'node:worker_threads';
import { AbstractActor, type ActorContext } from 'agents-world/lib/actor.ts';
import type { Message } from 'agents-world/lib/protocol.ts';
import { FileBarrier } from '../src/barrier.ts';
import { closePool } from '../src/db.ts';
import { transfer, type TransferResult } from '../src/transfer.ts';
import {
    readOptions,
    type BankAgentOptions,
    type ParticipantOptions,
} from './bankAgentOptions.ts';

/** Имя типа: под ним агент указывается в составе мира. */
const AGENT_TYPE = 'BankAgent';

/** Экспорт `type` — часть контракта модуля агента. */
export const type = AGENT_TYPE;

/** Адрес модуля: по нему поток загружает код агента. */
export const moduleUrl = import.meta.url;

export class BankAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #id: string;
    readonly #options: BankAgentOptions;
    readonly #participant: ParticipantOptions;
    readonly #barrier: FileBarrier;
    #result: TransferResult | null = null;
    #error: string | null = null;

    constructor(id: string, options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#id = id;
        this.#options = readOptions(options);
        const participant = this.#options.participants[id];
        if (participant === undefined) {
            throw new Error(`для агента «${id}» не задана операция в options.participants`);
        }
        this.#participant = participant;
        this.#barrier = new FileBarrier({
            dir: this.#options.barrierDir,
            name: this.#options.barrierName,
            expected: Object.keys(this.#options.participants).length,
            timeoutMs: this.#options.barrierTimeoutMs,
        });
    }

    /**
     * Выполняет операцию агента.
     *
     * Ошибка не выбрасывается наружу: сбой одной операции не должен убивать
     * актора — он запоминается и уезжает в отчёт вместе с остальными данными.
     */
    async start(context: ActorContext): Promise<void> {
        const { kind, delta, logicDelayMs } = this.#participant;
        context.log(
            `${kind} ${formatDelta(delta)} ₽ на счёт №${this.#options.accountId} ` +
                `(${this.#options.strategy}, ${this.#options.isolation})`,
        );
        try {
            this.#result = await transfer({
                config: {
                    databaseUrl: this.#options.databaseUrl,
                    accountId: this.#options.accountId,
                    initialBalance: this.#options.initialBalance,
                    barrierTimeoutMs: this.#options.barrierTimeoutMs,
                },
                agent: this.#id,
                kind,
                delta,
                accountId: this.#options.accountId,
                logicDelayMs,
                isolation: this.#options.isolation,
                strategy: this.#options.strategy,
                barrier: this.#barrier,
                maxAttempts: this.#options.maxAttempts,
            });
            const { balanceBefore, balanceAfter, attempts, conflicts } = this.#result;
            const tail = conflicts.length === 0 ? '' : `, конфликтов: ${conflicts.length}`;
            context.log(`${kind}: ${balanceBefore} → ${balanceAfter} ₽ (попыток: ${attempts}${tail})`);
        } catch (error) {
            this.#error = error instanceof Error ? error.message : String(error);
            context.log(`${kind}: сбой — ${this.#error}`);
        }
    }

    /** Закрывает соединения этого потока: иначе поток не завершится. */
    async stop(): Promise<void> {
        await closePool();
    }

    /** Работает по сценарию в `start`; входящие сообщения агенту не нужны. */
    protected override handle(message: Message, context: ActorContext): void {
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    /** Что показывать в отчёте и дашборде: роль, поток, итог попытки. */
    protected override describe(): Readonly<Record<string, unknown>> {
        return {
            participant: { kind: this.#participant.kind, delta: this.#participant.delta },
            threadId,
            strategy: this.#options.strategy,
            isolation: this.#options.isolation,
            accountId: this.#options.accountId,
            done: this.#result !== null || this.#error !== null,
            result: this.#result,
            error: this.#error,
        };
    }
}

/** Создаёт агента: этого ждёт загрузчик модуля. */
export function createAgent(id: string, options: Readonly<Record<string, unknown>> = {}): BankAgent {
    return new BankAgent(id, options);
}

/** Приводит сумму к виду `+500` / `−300`. */
function formatDelta(delta: number): string {
    return delta >= 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}
