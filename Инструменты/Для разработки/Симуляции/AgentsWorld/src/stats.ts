/**
 * Статистика мира — то, что пользователь передаёт в `World`.
 *
 * Формат намеренно простой: «тип агента → количество». Модуль превращает эту
 * статистику в список нарядов на создание акторов и проверяет входные данные,
 * чтобы ошибка в конфигурации всплывала до запуска потоков, а не внутри воркера.
 */

import type { ActorAssignment } from './protocol.ts';

/** Статистика мира: сколько агентов каждого типа должно существовать. */
export type PopulationStats = Readonly<Record<string, number>>;

/**
 * Разворачивает статистику в список нарядов.
 *
 * Идентификаторы получаются предсказуемыми: `EchoAgent-1`, `EchoAgent-2`, …
 * Нулевое количество допускается и означает «агентов этого типа нет».
 *
 * @throws если тип пустой, количество не целое или отрицательное, либо мир пуст
 */
export function normalizePopulation(stats: PopulationStats): ActorAssignment[] {
    if (typeof stats !== 'object' || stats === null) {
        throw new Error('статистика мира должна быть объектом «тип агента → количество»');
    }
    const assignments: ActorAssignment[] = [];
    for (const [rawType, count] of Object.entries(stats)) {
        const type = rawType.trim();
        if (type === '') {
            throw new Error('тип агента не может быть пустым');
        }
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new Error(`количество агентов типа «${type}» должно быть целым неотрицательным, получено ${String(count)}`);
        }
        for (let index = 1; index <= count; index += 1) {
            assignments.push({ id: `${type}-${index}`, type, options: {} });
        }
    }
    if (assignments.length === 0) {
        throw new Error('мир не может быть пустым: нужен хотя бы один агент');
    }
    return assignments;
}

/**
 * Сводка по составу мира: тип → сколько нарядов получилось.
 *
 * Используется в логах и демо, чтобы показать, что статистика развернулась верно.
 */
export function summarizePopulation(assignments: readonly ActorAssignment[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const assignment of assignments) {
        summary[assignment.type] = (summary[assignment.type] ?? 0) + 1;
    }
    return summary;
}
