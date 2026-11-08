/**
 * Что происходит в примере: участники и сценарии.
 *
 * Оба агента работают с одним и тем же счётом. Один зачисляет зарплату, второй
 * списывает аренду. Правильный итог всегда один: `1000 + 500 − 300 = 1200 ₽`.
 * Сценарии отличаются только тем, чем защищена транзакция, — и этого достаточно,
 * чтобы итог стал разным.
 */

import type { IsolationLevel } from './db.ts';
import type { StrategyName } from './strategies.ts';

/** Участник: агент и операция, которую он выполняет. */
export interface Participant {
    /** Идентификатор агента: agents-world выдаёт `Тип-N` по порядку. */
    readonly id: string;
    readonly kind: string;
    /** На сколько меняется баланс. */
    readonly delta: number;
    /**
     * Пауза «бизнес-логики» между чтением и записью, мс.
     *
     * Она же делает порядок записей предсказуемым: списание гарантированно
     * фиксируется позже зачисления, поэтому итог первого сценария не «плавает».
     */
    readonly logicDelayMs: number;
}

/** Участники сценария: общий счёт, две одновременные операции. */
export const PARTICIPANTS: readonly Participant[] = [
    { id: 'BankAgent-1', kind: 'зачисление', delta: 500, logicDelayMs: 0 },
    { id: 'BankAgent-2', kind: 'списание', delta: -300, logicDelayMs: 120 },
];

/** Один сценарий прогона. */
export interface Scenario {
    /** Короткое имя: попадает в имена барьеров и в сводку. */
    readonly name: string;
    readonly title: string;
    /** Какую мысль показывает сценарий. */
    readonly goal: string;
    readonly strategy: StrategyName;
    readonly isolation: IsolationLevel;
    /** Должен ли итог совпасть с ожидаемым. */
    readonly expectedCorrect: boolean;
}

/** Сценарии в порядке прогона: от «как делать не надо» к «как надо». */
export const SCENARIOS: readonly Scenario[] = [
    {
        name: 'lost-update',
        title: 'Потерянное обновление',
        goal: 'оба агента читают один и тот же баланс и перезаписывают его вслепую',
        strategy: 'read-modify-write',
        isolation: 'read committed',
        expectedCorrect: false,
    },
    {
        name: 'repeatable-read',
        title: 'REPEATABLE READ и повтор транзакции',
        goal: 'второй UPDATE получает 40001, транзакция повторяется на свежем снимке',
        strategy: 'read-modify-write',
        isolation: 'repeatable read',
        expectedCorrect: true,
    },
    {
        name: 'for-update',
        title: 'Блокировка строки',
        goal: 'SELECT … FOR UPDATE выстраивает агентов в очередь, второй видит новое значение',
        strategy: 'for-update',
        isolation: 'read committed',
        expectedCorrect: true,
    },
    {
        name: 'atomic',
        title: 'Атомарное приращение',
        goal: 'balance = balance + delta считает PostgreSQL — читать и перезаписывать нечего',
        strategy: 'atomic',
        isolation: 'read committed',
        expectedCorrect: true,
    },
];
