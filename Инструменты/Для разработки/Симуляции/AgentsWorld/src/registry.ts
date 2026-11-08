/**
 * Реестр агентов: «тип агента → фабрика».
 *
 * Мир описывает состав статистикой («EchoAgent: 5»), а создать экземпляр по
 * строковому типу можно только через реестр: строки — единственное, что можно
 * передать в другой поток, фабрики и классы не сериализуются.
 *
 * Поэтому воркер поднимает реестр сам (`createDefaultRegistry`), а главный поток
 * использует тот же реестр, чтобы проверить состав до запуска потоков.
 */

import type { Actor, ActorFactory } from './actor.ts';
import { ECHO_AGENT_TYPE, EchoAgent } from './agents/echoAgent.ts';

export class AgentRegistry {
    /** Известные типы агентов. */
    readonly #factories = new Map<string, ActorFactory>();

    /**
     * Регистрирует тип агента.
     *
     * @throws если тип пустой или уже занят
     */
    register(type: string, factory: ActorFactory): this {
        const name = type.trim();
        if (name === '') {
            throw new Error('тип агента не может быть пустым');
        }
        if (this.#factories.has(name)) {
            throw new Error(`тип агента «${name}» уже зарегистрирован`);
        }
        this.#factories.set(name, factory);
        return this;
    }

    /** Есть ли такой тип в реестре. */
    has(type: string): boolean {
        return this.#factories.has(type);
    }

    /** Все известные типы — для сообщений об ошибке и для документации. */
    types(): string[] {
        return [...this.#factories.keys()];
    }

    /**
     * Создаёт актора нужного типа.
     *
     * @throws если тип не зарегистрирован
     */
    create(type: string, id: string, options: Readonly<Record<string, unknown>> = {}): Actor {
        const factory = this.#factories.get(type);
        if (!factory) {
            throw new Error(`неизвестный тип агента «${type}»; известны: ${this.types().join(', ') || '—'}`);
        }
        return factory(id, options);
    }
}

/** Реестр с агентами, которые есть в проекте «из коробки». */
export function createDefaultRegistry(): AgentRegistry {
    return new AgentRegistry().register(ECHO_AGENT_TYPE, (_id, options) => new EchoAgent(options));
}
