/**
 * Загрузка кода агента по адресу модуля — работает внутри потока.
 *
 * Зачем так: класс и функцию нельзя передать в другой поток (передаются только
 * данные), поэтому воркер получает строку `moduleUrl` и загружает модуль сам.
 * Отсюда два следствия:
 *
 * 1. Каждый поток загружает модуль один раз и переиспользует фабрику — кэш ниже.
 * 2. Ошибка загрузки должна быть понятной: путь модуля, причина, что делать.
 *
 * Модуль обязан экспортировать `createAgent` — это единственное требование к его
 * содержимому (см. `lib/agentPlugin.ts`).
 */

import type { ActorFactory } from './actor.ts';

/** Кэш «адрес модуля → фабрика»: загрузка модуля недешёвая, а потоков много. */
const factories = new Map<string, Promise<ActorFactory>>();

/**
 * Загружает фабрику агента по адресу модуля.
 *
 * @throws если модуль не загрузился или в нём нет `createAgent`
 */
export function loadAgentFactory(moduleUrl: string): Promise<ActorFactory> {
    const cached = factories.get(moduleUrl);
    if (cached) {
        return cached;
    }
    const loading = importFactory(moduleUrl);
    factories.set(moduleUrl, loading);
    return loading;
}

/** Загружает модуль и достаёт из него `createAgent`. */
async function importFactory(moduleUrl: string): Promise<ActorFactory> {
    let loaded: unknown;
    try {
        loaded = await import(moduleUrl);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        factories.delete(moduleUrl);
        throw new Error(`не удалось загрузить модуль агента ${moduleUrl}: ${reason}`);
    }
    const factory = (loaded as { createAgent?: unknown }).createAgent;
    if (typeof factory !== 'function') {
        throw new Error(`в модуле агента ${moduleUrl} нет экспорта createAgent`);
    }
    return factory as ActorFactory;
}
