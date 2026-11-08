/**
 * HumanCatalogAgent — единственный в мире каталог людей.
 *
 * Помогает агентам находить друг друга: человек регистрируется в каталоге, указав
 * имя, пол и профессию, а любой агент может попросить каталог найти людей по этим
 * свойствам.
 *
 * Каталог ничего не «видит» сам: он не может заглянуть в других акторов. Всё, что
 * он знает, пришло сообщениями `catalog-register`, поэтому регистрация — часть
 * поведения человека (см. `agents/humanAgent.ts`).
 *
 * Адреса для ответа передаются в `payload.replyTo`, потому что контракт актора не
 * передаёт отправителя в обработчик.
 */

import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

/** Имя типа: под ним агент указывается в составе мира. */
const AGENT_TYPE = 'HumanCatalogAgent';

/** Экспорт `type` — часть контракта модуля агента (`lib/agentPlugin.ts`). */
export const type = AGENT_TYPE;

/** Адрес модуля: по нему поток загружает код агента. */
export const moduleUrl = import.meta.url;

/** Постоянный адрес единственного каталога. */
export const HUMAN_CATALOG_AGENT_ID = 'HumanCatalogAgent-1';

/** Регистрация человека: полезная нагрузка — `HumanRecord`. */
export const CATALOG_REGISTER = 'catalog-register';

/** Поиск: полезная нагрузка — `{ criteria, replyTo }`. */
export const CATALOG_SEARCH = 'catalog-search';

/** Результат поиска: полезная нагрузка — `CatalogResult`. */
export const CATALOG_RESULT = 'catalog-result';

/** Пол человека. */
export type Gender = 'мужчина' | 'женщина';

/** Что каталог знает о человеке. */
export interface HumanRecord {
    /** Адрес человека в мире: по нему можно написать ему сообщение. */
    readonly id: string;
    readonly name: string;
    readonly gender: Gender;
    readonly profession: string;
}

/** Условия поиска: пустое поле означает «не важно». */
export interface SearchCriteria {
    readonly name?: string;
    readonly gender?: Gender;
    readonly profession?: string;
}

/** Ответ каталога на поиск. */
export interface CatalogResult {
    readonly criteria: SearchCriteria;
    readonly matches: readonly HumanRecord[];
}

export class HumanCatalogAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    /** Кого каталог уже знает: адрес → запись. */
    readonly #humans = new Map<string, HumanRecord>();

    /** Отвечает на регистрацию и поиск. */
    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === CATALOG_REGISTER) {
            const record = readRecord(message.payload);
            this.#humans.set(record.id, record);
            context.log(`записал в каталог: ${record.name} (${record.gender}, ${record.profession}) → ${record.id}`);
            return;
        }
        if (message.type === CATALOG_SEARCH) {
            const payload = message.payload as { criteria?: unknown; replyTo?: unknown } | undefined;
            const criteria = readCriteria(payload?.criteria);
            const replyTo = readReplyTo(payload?.replyTo);
            const matches = this.search(criteria);
            context.log(`искали ${humanParts(criteria)}: найдено ${matches.length}`);
            if (replyTo === null) {
                context.log('поиск пришёл без обратного адреса, ответ отправить некому');
                return;
            }
            const result: CatalogResult = { criteria, matches };
            context.send(replyTo, createMessage(CATALOG_RESULT, result));
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    /** Ищет людей по свойствам; пустые условия возвращают всех. */
    search(criteria: SearchCriteria): HumanRecord[] {
        return [...this.#humans.values()].filter(
            (human) =>
                (criteria.name === undefined || human.name === criteria.name) &&
                (criteria.gender === undefined || human.gender === criteria.gender) &&
                (criteria.profession === undefined || human.profession === criteria.profession),
        );
    }

    /** Сколько людей каталог знает. */
    get size(): number {
        return this.#humans.size;
    }
}

/** Создаёт агента: этого ждёт загрузчик модуля. */
export function createAgent(_id: string, _options: Readonly<Record<string, unknown>> = {}): HumanCatalogAgent {
    return new HumanCatalogAgent();
}

/** Читает запись о человеке из сообщения регистрации. */
function readRecord(payload: unknown): HumanRecord {
    const candidate = payload as Partial<HumanRecord> | undefined;
    if (typeof candidate?.id !== 'string' || candidate.id.trim() === '') {
        throw new Error('в регистрации нет адреса человека (id)');
    }
    if (typeof candidate.name !== 'string' || candidate.name.trim() === '') {
        throw new Error('в регистрации нет имени человека (name)');
    }
    if (candidate.gender !== 'мужчина' && candidate.gender !== 'женщина') {
        throw new Error('в регистрации пол должен быть «мужчина» или «женщина»');
    }
    if (typeof candidate.profession !== 'string' || candidate.profession.trim() === '') {
        throw new Error('в регистрации нет профессии человека (profession)');
    }
    return { id: candidate.id, name: candidate.name, gender: candidate.gender, profession: candidate.profession };
}

/** Читает условия поиска: мусор в полях считается «не важно». */
function readCriteria(value: unknown): SearchCriteria {
    const candidate = value as Partial<SearchCriteria> | undefined;
    const criteria: { name?: string; gender?: Gender; profession?: string } = {};
    if (typeof candidate?.name === 'string' && candidate.name.trim() !== '') {
        criteria.name = candidate.name;
    }
    if (candidate?.gender === 'мужчина' || candidate?.gender === 'женщина') {
        criteria.gender = candidate.gender;
    }
    if (typeof candidate?.profession === 'string' && candidate.profession.trim() !== '') {
        criteria.profession = candidate.profession;
    }
    return criteria;
}

/** Достаёт адрес для ответа. */
function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Человеческое описание условий поиска для лога. */
function humanParts(criteria: SearchCriteria): string {
    const parts = [
        criteria.name === undefined ? null : `имя «${criteria.name}»`,
        criteria.gender === undefined ? null : `пол «${criteria.gender}»`,
        criteria.profession === undefined ? null : `профессия «${criteria.profession}»`,
    ].filter((part) => part !== null);
    return parts.length === 0 ? 'всех людей' : parts.join(', ');
}

