import type { ActorFactory } from './actor.ts';

const factories = new Map<string, Promise<ActorFactory>>();

export function loadAgentFactory(moduleUrl: string): Promise<ActorFactory> {
    const cached = factories.get(moduleUrl);
    if (cached) {
        return cached;
    }
    const loading = importFactory(moduleUrl);
    factories.set(moduleUrl, loading);
    return loading;
}

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
