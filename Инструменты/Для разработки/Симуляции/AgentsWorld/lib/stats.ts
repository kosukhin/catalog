/**
 * Статистика мира — то, что пользователь передаёт в `World`.
 *
 * Формат намеренно простой: «тип агента → количество». Модуль превращает эту
 * статистику в список заготовок акторов и проверяет входные данные, чтобы ошибка
 * в конфигурации всплывала до запуска потоков, а не внутри воркера.
 *
 * Модуль ничего не знает об агентах: тип остаётся строкой, а адрес модуля агента
 * подставляет `World` (`lib/world.ts`), когда сверяет статистику с подключёнными
 * модулями.
 */

import type { ActorAssignment } from './protocol.ts';

/** Статистика мира: сколько агентов каждого типа должно существовать. */
export type PopulationStats = Readonly<Record<string, number>>;

/** Заготовка актора: всё, что даёт статистика, — без адреса модуля агента. */
export type AgentDraft = Omit<ActorAssignment, 'moduleUrl'>;

/**
 * Разворачивает статистику в список заготовок.
 *
 * Идентификаторы получаются предсказуемыми: `МойАгент-1`, `МойАгент-2`, …
 * Нулевое количество допускается и означает «агентов этого типа нет».
 *
 * @throws если тип пустой, количество не целое или отрицательное, либо мир пуст
 */
export function normalizePopulation(stats: PopulationStats): AgentDraft[] {
    if (typeof stats !== 'object' || stats === null) {
        throw new Error('статистика мира должна быть объектом «тип агента → количество»');
    }
    const drafts: AgentDraft[] = [];
    for (const [rawType, count] of Object.entries(stats)) {
        const type = rawType.trim();
        if (type === '') {
            throw new Error('тип агента не может быть пустым');
        }
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new Error(`количество агентов типа «${type}» должно быть целым неотрицательным, получено ${String(count)}`);
        }
        for (let index = 1; index <= count; index += 1) {
            drafts.push({ id: `${type}-${index}`, type, options: {} });
        }
    }
    if (drafts.length === 0) {
        throw new Error('мир не может быть пустым: нужен хотя бы один агент');
    }
    return drafts;
}

/**
 * Сводка по составу мира: тип → сколько заготовок получилось.
 *
 * Используется в логах и демо, чтобы показать, что статистика развернулась верно.
 */
export function summarizePopulation(drafts: readonly AgentDraft[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const draft of drafts) {
        summary[draft.type] = (summary[draft.type] ?? 0) + 1;
    }
    return summary;
}
