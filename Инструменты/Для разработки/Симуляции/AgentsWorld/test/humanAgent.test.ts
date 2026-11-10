import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as human from '../agents/humanAgent.ts';
import * as day from '../agents/dayAgent.ts';
import * as catalog from '../agents/humanCatalogAgent.ts';
import * as physics from '../agents/physicsAgent.ts';
import * as bulletin from '../agents/bulletinBoardAgent.ts';
import * as bank from '../agents/bankAgent.ts';
import * as house from '../agents/houseAgent.ts';
import * as toilet from '../agents/toiletAgent.ts';
import { createMessage } from '../lib/protocol/message.ts';
import { TICK } from '../lib/protocol/names.ts';
import type { ActorContext } from '../lib/actor.ts';

const ID = 'HumanAgent-1';

interface Fixture {
    readonly agent: human.HumanAgent;
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function fixture(roll = 0.9): Fixture {
    const log: string[] = [];
    const sent: Array<{ to: string; type: string; payload: unknown }> = [];
    const context: ActorContext = {
        id: ID,
        send: (to, message): void => {
            sent.push({ to, type: message.type, payload: message.payload });
        },
        log: (text): void => {
            log.push(text);
        },
    };
    const agent = new human.HumanAgent({ name: 'Иван', gender: 'мужчина', profession: 'врач', random: () => roll });
    return { agent, context, log, sent };
}

function last(fixtureValue: Fixture): { to: string; type: string; payload: unknown } | undefined {
    return fixtureValue.sent.at(-1);
}

function withAccountAndHouse(value: Fixture): void {
    value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);
    value.agent.receive(createMessage(bulletin.BULLETIN_RESULT, { type: 'BankAgent', ids: ['BankAgent-1'] }), value.context);
    value.agent.receive(createMessage(bank.BANK_ACCOUNT, { owner: ID, balance: 1000 }), value.context);
    value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);
    value.agent.receive(
        createMessage(house.HOUSE_REPORT, { owner: ID, houseId: 'House-HumanAgent-1', position: { x: 5, y: 0, z: 0 }, accepted: true, reason: null }),
        value.context,
    );
}

describe('HumanAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(human.type, 'HumanAgent');
        assert.match(human.moduleUrl, /agents\/humanAgent\.ts$/);
        assert.equal(human.createAgent(ID, { name: 'Иван', gender: 'мужчина' }).state().name, 'Иван');
    });

    it('при старте идёт в каталог, встаёт в пространство и спрашивает время', () => {
        const value = fixture();

        value.agent.start(value.context);

        assert.deepEqual(value.sent.map((item) => `${item.to}:${item.type}`), [
            `${catalog.HUMAN_CATALOG_AGENT_ID}:${catalog.CATALOG_REGISTER}`,
            `${physics.PHYSICS_AGENT_ID}:${physics.PHYSICS_REGISTER}`,
            `${day.DAY_AGENT_ID}:${day.TIME_REQUEST}`,
        ]);
        assert.deepEqual(value.sent[0]?.payload, { id: ID, name: 'Иван', gender: 'мужчина', profession: 'врач' });
    });

    it('ночью спит', () => {
        const value = fixture();

        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'ночь' }), value.context);

        assert.equal(value.agent.state().phase, 'ночь');
        assert.equal(value.agent.state().state, 'спит');
    });

    it('днём сначала ищет банк через доску объявлений', () => {
        const value = fixture();

        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);

        assert.equal(value.agent.state().state, 'активен');
        assert.equal(last(value)?.to, bulletin.BULLETIN_BOARD_AGENT_ID);
        assert.equal(last(value)?.type, bulletin.BULLETIN_FIND);
        assert.deepEqual(last(value)?.payload, { type: 'BankAgent', replyTo: ID });
    });

    it('после банка открывает счёт и покупает дом', () => {
        const value = fixture();

        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);
        value.agent.receive(createMessage(bulletin.BULLETIN_RESULT, { type: 'BankAgent', ids: ['BankAgent-1'] }), value.context);
        assert.equal(last(value)?.to, 'BankAgent-1');
        assert.equal(last(value)?.type, bank.BANK_OPEN);

        value.agent.receive(createMessage(bank.BANK_ACCOUNT, { owner: ID, balance: 1000 }), value.context);
        assert.equal(value.agent.state().bankId, 'BankAgent-1');
        assert.equal(value.agent.state().balance, 1000);

        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);
        assert.equal(last(value)?.to, house.HOUSE_AGENT_ID);
        assert.equal(last(value)?.type, house.HOUSE_BUY);
        assert.deepEqual(last(value)?.payload, { owner: ID, bankId: 'BankAgent-1', replyTo: ID });

        value.agent.receive(createMessage(house.HOUSE_REPORT, { owner: ID, houseId: 'House-HumanAgent-1', accepted: true, reason: null }), value.context);
        assert.equal(value.agent.state().house, 'House-HumanAgent-1');
    });

    it('сообщает, если дом купить не удалось', () => {
        const value = fixture();
        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);
        value.agent.receive(createMessage(bulletin.BULLETIN_RESULT, { type: 'BankAgent', ids: ['BankAgent-1'] }), value.context);
        value.agent.receive(createMessage(bank.BANK_ACCOUNT, { owner: ID, balance: 1000 }), value.context);
        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);

        value.agent.receive(createMessage(house.HOUSE_REPORT, { accepted: false, reason: 'недостаточно средств' }), value.context);

        assert.equal(value.agent.state().house, null);
        assert.match(value.log.at(-1) ?? '', /не смог купить дом: недостаточно средств/);
    });

    it('идёт в туалет и возвращается домой: запрос, движение, вход, выход', () => {
        const value = fixture(0.05);
        withAccountAndHouse(value);

        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);
        assert.equal(value.agent.state().state, 'идёт в туалет');
        assert.equal(last(value)?.to, toilet.TOILET_AGENT_ID);
        assert.equal(last(value)?.type, toilet.TOILET_REQUEST);

        value.agent.receive(createMessage(toilet.TOILET_QUEUED, { id: ID, position: 1 }), value.context);
        assert.equal(value.agent.state().state, 'идёт в туалет');
        assert.equal(value.agent.state().toilet, 'запросил');
        assert.equal(last(value)?.to, physics.PHYSICS_AGENT_ID);
        assert.equal(last(value)?.type, physics.PHYSICS_MOVE_TO);
        assert.deepEqual(last(value)?.payload, { id: ID, targetId: toilet.TOILET_AGENT_ID, replyTo: ID });

        value.agent.receive(createMessage(physics.PHYSICS_ARRIVED, { id: ID, position: { x: 0, y: 49, z: 0 } }), value.context);
        assert.equal(value.agent.state().state, 'идёт в туалет');
        assert.match(value.log.at(-1) ?? '', /жду место/);

        value.agent.receive(createMessage(toilet.TOILET_GRANTED, { id: ID }), value.context);
        assert.equal(value.agent.state().toilet, 'идёт');
        assert.equal(last(value)?.type, physics.PHYSICS_MOVE_TO);

        value.agent.receive(createMessage(physics.PHYSICS_ARRIVED, { id: ID, position: { x: 0, y: 50, z: 0 } }), value.context);
        assert.equal(value.agent.state().state, 'в туалете');
        assert.equal(last(value)?.type, toilet.TOILET_ENTER);

        value.agent.receive(createMessage(toilet.TOILET_RELEASED, { id: ID }), value.context);
        assert.equal(value.agent.state().state, 'идёт домой');
        assert.equal(value.agent.state().toilet, 'нет');
        assert.equal(last(value)?.to, physics.PHYSICS_AGENT_ID);
        assert.equal(last(value)?.type, physics.PHYSICS_MOVE_TO);
        assert.deepEqual(last(value)?.payload, { id: ID, targetId: 'House-HumanAgent-1', replyTo: ID });

        value.agent.receive(createMessage(physics.PHYSICS_ARRIVED, { id: ID, position: { x: 5, y: 0, z: 0 } }), value.context);
        assert.equal(value.agent.state().state, 'активен');
        assert.match(value.log.at(-1) ?? '', /вернулся домой/);
    });

    it('в списке желающих идёт к туалету, но без места не входит', () => {
        const value = fixture(0.05);
        withAccountAndHouse(value);
        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);

        value.agent.receive(createMessage(toilet.TOILET_QUEUED, { id: ID, position: 1 }), value.context);
        assert.equal(value.agent.state().state, 'идёт в туалет');
        assert.equal(last(value)?.type, physics.PHYSICS_MOVE_TO);

        value.agent.receive(createMessage(physics.PHYSICS_ARRIVED, { id: ID, position: { x: 0, y: 49, z: 0 } }), value.context);
        assert.equal(value.agent.state().state, 'идёт в туалет');
        assert.equal(value.agent.state().toilet, 'запросил');
        assert.match(value.log.at(-1) ?? '', /жду место/);

        const before = value.sent.length;
        value.agent.receive(createMessage(TICK), value.context);
        assert.equal(value.sent.length, before + 1);
        assert.equal(last(value)?.type, day.TIME_REQUEST);
    });

    it('при отказе физики не отменяет поход, а пробует снова', () => {
        const value = fixture(0.05);
        withAccountAndHouse(value);
        value.agent.receive(createMessage(day.TIME_REPORT, { phase: 'день' }), value.context);
        value.agent.receive(createMessage(toilet.TOILET_GRANTED, { id: ID }), value.context);

        value.agent.receive(createMessage(physics.PHYSICS_REPORT, { id: ID, accepted: false, reason: 'на пути тело' }), value.context);

        assert.equal(value.agent.state().toilet, 'идёт');
        assert.equal(value.agent.state().state, 'идёт в туалет');
        assert.match(value.log.at(-1) ?? '', /попробую ещё/);
        assert.equal(
            value.sent.some((item) => item.type === toilet.TOILET_LEAVE),
            false,
        );

        value.agent.receive(createMessage(TICK), value.context);
        assert.equal(last(value)?.type, physics.PHYSICS_MOVE_TO);
        assert.deepEqual(last(value)?.payload, { id: ID, targetId: toilet.TOILET_AGENT_ID, replyTo: ID });
    });

    it('по импульсу заново спрашивает время', () => {
        const value = fixture();

        value.agent.receive(createMessage(TICK), value.context);

        assert.deepEqual(last(value), { to: day.DAY_AGENT_ID, type: day.TIME_REQUEST, payload: { replyTo: ID } });
    });

    it('пересылает поиск в каталог и печатает результат', () => {
        const value = fixture();

        value.agent.receive(createMessage(catalog.CATALOG_SEARCH, { criteria: { profession: 'врач' } }), value.context);
        assert.deepEqual(last(value)?.payload, { criteria: { profession: 'врач' }, replyTo: ID });

        value.agent.receive(createMessage(catalog.CATALOG_RESULT, { matches: [{ id: 'HumanAgent-2', name: 'Анна', gender: 'женщина', profession: 'врач' }] }), value.context);
        assert.match(value.log.at(-1) ?? '', /нашёл: Анна \(врач\)/);
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const value = fixture();

        value.agent.receive(createMessage('что-то'), value.context);

        assert.match(value.log.at(-1) ?? '', /не знаю, что делать с сообщением «что-то»/);
    });

    it('выбирает свойства случайно, если их не задали', () => {
        const first = new human.HumanAgent({ random: () => 0 });
        const other = new human.HumanAgent({ random: () => 0.99 });

        assert.equal(first.state().name, 'Иван');
        assert.equal(other.state().name, 'Ольга');
        assert.equal(first.state().profession, 'инженер');
        assert.equal(other.state().profession, 'водитель');
    });

    it('проверяет настройки', () => {
        assert.throws(() => new human.HumanAgent({ name: '', gender: 'мужчина' }), /name должен быть непустой строкой/);
        assert.throws(() => new human.HumanAgent({ name: 'Иван', gender: 'робот' }), /gender должен быть/);
        assert.throws(() => new human.HumanAgent({ profession: '' }), /profession должен быть непустой строкой/);
        assert.throws(() => new human.HumanAgent({ random: 5 }), /random должен быть функцией/);
    });
});

