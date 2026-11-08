/**
 * Протокол мира: сообщения акторов и служебные команды между миром и потоками.
 *
 * Модуль не импортирует ничего — это «словарь», на который опираются остальные
 * модули. Здесь два независимых набора типов:
 *
 * 1. `Message` — то, чем акторы обмениваются через почтовые ящики. Акторы никогда
 *    не вызывают друг друга напрямую, поэтому любое взаимодействие описывается
 *    сообщением с типом и полезной нагрузкой.
 * 2. `WorkerCommand` / `WorkerEvent` — служебный канал «главный поток ↔ воркер».
 *    Он нужен только рантайму: доставить сообщение в чужой поток и вернуть лог.
 */

/** Идентификатор актора внутри мира. */
export type ActorId = string;

/** Сообщение — единственный способ общения акторов между собой. */
export interface Message {
    /** Тип сообщения: по нему актор решает, как его обрабатывать. */
    readonly type: string;
    /** Полезная нагрузка произвольной формы (должна переживать structured clone). */
    readonly payload?: unknown;
}

/** Наряд на создание одного актора. */
export interface ActorAssignment {
    /** Уникальный идентификатор актора, например `EchoAgent-1`. */
    readonly id: ActorId;
    /** Тип агента: ключ в реестре агентов. */
    readonly type: string;
    /** Настройки конкретного экземпляра. */
    readonly options: Readonly<Record<string, unknown>>;
}

/** Команды, которые главный поток отправляет воркеру. */
export type WorkerCommand =
    | { readonly kind: 'start'; readonly actors: readonly ActorAssignment[] }
    | { readonly kind: 'deliver'; readonly from: ActorId; readonly to: ActorId; readonly message: Message }
    | { readonly kind: 'stop' };

/** События, которые воркер отправляет главному потоку. */
export type WorkerEvent =
    | { readonly kind: 'ready'; readonly actorIds: readonly ActorId[] }
    | { readonly kind: 'deliver'; readonly from: ActorId; readonly to: ActorId; readonly message: Message }
    | { readonly kind: 'log'; readonly actorId: ActorId; readonly threadId: number; readonly text: string }
    | { readonly kind: 'error'; readonly actorId: ActorId | null; readonly text: string }
    | { readonly kind: 'done' };

/**
 * Создаёт сообщение, проверяя тип.
 *
 * @param type непустой тип сообщения, например `echo`
 * @param payload полезная нагрузка; если не передана, ключа в объекте не будет
 */
export function createMessage(type: string, payload?: unknown): Message {
    if (typeof type !== 'string' || type.trim() === '') {
        throw new Error('тип сообщения должен быть непустой строкой');
    }
    return payload === undefined ? { type } : { type, payload };
}

/**
 * Проверяет, что значение похоже на сообщение актора.
 *
 * Нужна на границе с внешним кодом и в тестах: в поток сообщение попадает через
 * structured clone, поэтому доверять его форме нельзя.
 */
export function isMessage(value: unknown): value is Message {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as { type?: unknown };
    return typeof candidate.type === 'string' && candidate.type.trim() !== '';
}
