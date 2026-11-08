/**
 * Контракт «модуль агента» — единственное, что `lib` знает об агентах.
 *
 * Ядро мира не знает ни одного конкретного агента и не содержит реестра: модули
 * агентов подключает тот, кто собирает мир (демо-скрипт или приложение). Модуль
 * агента обязан экспортировать три вещи:
 *
 * ```ts
 * export const type = 'МойАгент';                 // имя типа для статистики
 * export const moduleUrl = import.meta.url;       // собственный адрес: он уедет в поток
 * export function createAgent(id, options) {…}    // как создать экземпляр
 * ```
 *
 * Почему адрес, а не фабрика: в другой поток можно передать только данные, поэтому
 * воркер получает `moduleUrl` и сам делает `import(moduleUrl)` — см.
 * `lib/agentLoader.ts`.
 */

import type { ActorFactory } from './actor.ts';

/** Модуль агента, подключённый к миру. */
export interface AgentPlugin {
    /** Имя типа: по нему агент указывается в статистике мира. */
    readonly type: string;
    /** Адрес модуля (`import.meta.url`), по которому поток загрузит код агента. */
    readonly moduleUrl: string;
    /** Как создать агента: используется внутри потока. */
    readonly createAgent: ActorFactory;
}

/**
 * Проверяет, что значение похоже на модуль агента.
 *
 * @throws если нет `type`, `moduleUrl` или `createAgent`
 */
export function assertAgentPlugin(value: unknown): AgentPlugin {
    if (typeof value !== 'object' || value === null) {
        throw new Error('модуль агента должен быть объектом с полями type, moduleUrl, createAgent');
    }
    const candidate = value as { type?: unknown; moduleUrl?: unknown; createAgent?: unknown };
    if (typeof candidate.type !== 'string' || candidate.type.trim() === '') {
        throw new Error('в модуле агента нет строкового экспорта type');
    }
    if (typeof candidate.moduleUrl !== 'string' || candidate.moduleUrl.trim() === '') {
        throw new Error(`в модуле агента «${candidate.type}» нет строкового экспорта moduleUrl`);
    }
    if (typeof candidate.createAgent !== 'function') {
        throw new Error(`в модуле агента «${candidate.type}» нет функции createAgent`);
    }
    return candidate as unknown as AgentPlugin;
}
