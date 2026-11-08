import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../agents/humanCatalogAgent.ts';
import { createMessage } from '../lib/protocol.ts';
import type { ActorContext } from '../lib/actor.ts';

const { HumanCatalogAgent, CATALOG_REGISTER, CATALOG_SEARCH, CATALOG_RESULT, HUMAN_CATALOG_AGENT_ID } = catalog;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(): Fixture {
    const log: string[] = [];
    const sent: Array<{ to: string; type: string; payload: unknown }> = [];
    const context: ActorContext = {
        id: HUMAN_CATALOG_AGENT_ID,
        send: (to, message): void => {
            sent.push({ to, type: message.type, payload: message.payload });
        },
        log: (text): void => {
            log.push(text);
        },
    };
    return { context, log, sent };
}

const ivan = { id: 'HumanAgent-1', name: 'Иван', gender: 'мужчина', profession: 'врач' } as const;
const anna = { id: 'HumanAgent-2', name: 'Анна', gender: 'женщина', profession: 'врач' } as const;
const peter = { id: 'HumanAgent-3', name: 'Пётр', gender: 'мужчина', profession: 'повар' } as const;

/** Каталог с тремя людьми. */
function createFilledCatalog(): { agent: InstanceType<typeof HumanCatalogAgent>; fixture: Fixture } {
    const agent = new HumanCatalogAgent();
    const fixture = createContext();
    for (const human of [ivan, anna, peter]) {
        agent.receive(createMessage(CATALOG_REGISTER, human), fixture.context);
    }
    return { agent, fixture };
}

describe('HumanCatalogAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(catalog.type, 'HumanCatalogAgent');
        assert.match(catalog.moduleUrl, /agents\/humanCatalogAgent\.ts$/);
        assert.equal(HUMAN_CATALOG_AGENT_ID, 'HumanCatalogAgent-1');
        assert.equal(catalog.createAgent(HUMAN_CATALOG_AGENT_ID, {}).type, 'HumanCatalogAgent');
    });

    it('запоминает зарегистрированных людей', () => {
        const { agent, fixture } = createFilledCatalog();

        assert.equal(agent.size, 3);
        assert.match(fixture.log[0] ?? '', /записал в каталог: Иван/);
    });

    it('ищет по имени, полу и профессии', () => {
        const { agent } = createFilledCatalog();

        assert.deepEqual(agent.search({ name: 'Анна' }).map((human) => human.id), ['HumanAgent-2']);
        assert.deepEqual(agent.search({ gender: 'мужчина' }).map((human) => human.id), ['HumanAgent-1', 'HumanAgent-3']);
        assert.deepEqual(agent.search({ profession: 'врач' }).map((human) => human.id), ['HumanAgent-1', 'HumanAgent-2']);
        assert.deepEqual(agent.search({ profession: 'врач', gender: 'женщина' }).map((human) => human.id), ['HumanAgent-2']);
    });

    it('пустые условия возвращают всех', () => {
        const { agent } = createFilledCatalog();

        assert.equal(agent.search({}).length, 3);
        assert.equal(agent.search({ name: 'Никого' }).length, 0);
    });

    it('на поиск отвечает тому, кто спросил', () => {
        const { agent, fixture } = createFilledCatalog();

        agent.receive(createMessage(CATALOG_SEARCH, { criteria: { profession: 'врач' }, replyTo: 'HumanAgent-1' }), fixture.context);

        const answer = fixture.sent.at(-1);
        assert.equal(answer?.to, 'HumanAgent-1');
        assert.equal(answer?.type, CATALOG_RESULT);
        const matches = (answer?.payload as { matches?: Array<{ name: string }> } | undefined)?.matches ?? [];
        assert.deepEqual(matches.map((human) => human.name), ['Иван', 'Анна']);
    });

    it('без обратного адреса отвечает только в лог', () => {
        const { agent, fixture } = createFilledCatalog();
        const sentBefore = fixture.sent.length;

        agent.receive(createMessage(CATALOG_SEARCH, { criteria: {} }), fixture.context);

        assert.equal(fixture.sent.length, sentBefore);
        assert.match(fixture.log.at(-1) ?? '', /без обратного адреса/);
    });

    it('отвергает некорректную регистрацию', () => {
        const agent = new HumanCatalogAgent();
        const { context } = createContext();

        assert.throws(() => agent.receive(createMessage(CATALOG_REGISTER, { name: 'Иван' }), context), /нет адреса человека/);
        assert.throws(
            () => agent.receive(createMessage(CATALOG_REGISTER, { id: 'HumanAgent-1', name: 'Иван', gender: 'робот', profession: 'врач' }), context),
            /пол должен быть/,
        );
        assert.equal(agent.size, 0);
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new HumanCatalogAgent();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });
});
