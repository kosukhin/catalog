import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, type Message } from '../lib/protocol/message.ts';
import { CATALOG_REGISTER, CATALOG_RESULT, CATALOG_SEARCH, HUMAN_CATALOG_AGENT_ID } from './catalog/messages.ts';
import { humanParts, readCriteria, readRecord, readReplyTo } from './catalog/request.ts';
import type { CatalogResult, HumanRecord, SearchCriteria } from './catalog/types.ts';

const AGENT_TYPE = 'HumanCatalogAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export { CATALOG_REGISTER, CATALOG_RESULT, CATALOG_SEARCH, HUMAN_CATALOG_AGENT_ID };

export type { CatalogResult, Gender, HumanRecord, SearchCriteria } from './catalog/types.ts';

export class HumanCatalogAgent extends AbstractActor {
    readonly #humans = new Map<string, HumanRecord>();

    constructor() {
        super(AGENT_TYPE);
    }

    state(): { readonly known: number } {
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
}

export function createAgent(_id: string, _options: Readonly<Record<string, unknown>> = {}): HumanCatalogAgent {
    return new HumanCatalogAgent();
}
