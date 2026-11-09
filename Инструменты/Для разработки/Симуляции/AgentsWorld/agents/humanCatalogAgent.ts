import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol.ts';

const AGENT_TYPE = 'HumanCatalogAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export const HUMAN_CATALOG_AGENT_ID = 'HumanCatalogAgent-1';

export const CATALOG_REGISTER = 'catalog-register';

export const CATALOG_SEARCH = 'catalog-search';

export const CATALOG_RESULT = 'catalog-result';

export type Gender = 'мужчина' | 'женщина';

export interface HumanRecord {
    readonly id: string;
    readonly name: string;
    readonly gender: Gender;
    readonly profession: string;
}

export interface SearchCriteria {
    readonly name?: string;
    readonly gender?: Gender;
    readonly profession?: string;
}

export interface CatalogResult {
    readonly criteria: SearchCriteria;
    readonly matches: readonly HumanRecord[];
}

export class HumanCatalogAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #humans = new Map<string, HumanRecord>();

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

    protected override describe(): Readonly<Record<string, unknown>> {
        return { known: this.#humans.size };
    }

    search(criteria: SearchCriteria): HumanRecord[] {
        return [...this.#humans.values()].filter(
            (human) =>
                (criteria.name === undefined || human.name === criteria.name) &&
                (criteria.gender === undefined || human.gender === criteria.gender) &&
                (criteria.profession === undefined || human.profession === criteria.profession),
        );
    }

    get size(): number {
        return this.#humans.size;
    }
}

export function createAgent(_id: string, _options: Readonly<Record<string, unknown>> = {}): HumanCatalogAgent {
    return new HumanCatalogAgent();
}

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

function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function humanParts(criteria: SearchCriteria): string {
    const parts = [
        criteria.name === undefined ? null : `имя «${criteria.name}»`,
        criteria.gender === undefined ? null : `пол «${criteria.gender}»`,
        criteria.profession === undefined ? null : `профессия «${criteria.profession}»`,
    ].filter((part) => part !== null);
    return parts.length === 0 ? 'всех людей' : parts.join(', ');
}

