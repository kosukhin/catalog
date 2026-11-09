import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as human from '../agents/humanAgent.ts';
import { DAY_AGENT_ID, TIME_REPORT } from '../agents/dayAgent.ts';
import { CATALOG_REGISTER, CATALOG_RESULT, CATALOG_SEARCH, HUMAN_CATALOG_AGENT_ID } from '../agents/humanCatalogAgent.ts';
import { createMessage, TICK } from '../lib/protocol.ts';
import type { ActorContext } from '../lib/actor.ts';

const { HumanAgent } = human;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = 'HumanAgent-1'): Fixture {
    const log: string[] = [];
    const sent: Array<{ to: string; type: string; payload: unknown }> = [];
    const context: ActorContext = {
        id,
        send: (to, message): void => {
            sent.push({ to, type: message.type, payload: message.payload });
        },
        log: (text): void => {
            log.push(text);
        },
    };
    return { context, log, sent };
}

function createHuman(roll = 0.9): InstanceType<typeof HumanAgent> {
    return new HumanAgent({ name: 'Иван', gender: 'мужчина', profession: 'врач', random: () => roll });
}

describe('HumanAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(human.type, 'HumanAgent');
        assert.match(human.moduleUrl, /agents\/humanAgent\.ts$/);
        assert.equal(human.createAgent('HumanAgent-1', { name: 'Иван', gender: 'мужчина' }).name, 'Иван');
        assert.equal(createHuman().type, 'HumanAgent');
    });

    it('при старте регистрируется в каталоге и спрашивает время', () => {
        const agent = createHuman();
        const { context, log, sent } = createContext();

        agent.start(context);

        assert.match(log[0] ?? '', /я Иван, мужчина, врач/);
        assert.deepEqual(
            sent.map((item) => `${item.to}:${item.type}`),
            [`${HUMAN_CATALOG_AGENT_ID}:${CATALOG_REGISTER}`, `${DAY_AGENT_ID}:time-request`],
        );
        assert.deepEqual(sent[0]?.payload, { id: 'HumanAgent-1', name: 'Иван', gender: 'мужчина', profession: 'врач' });
        assert.deepEqual(sent[1]?.payload, { replyTo: 'HumanAgent-1' });
    });

    it('ночью спит, днём активен', () => {
        const { context } = createContext();

        const sleeper = createHuman();
        sleeper.receive(createMessage(TIME_REPORT, { phase: 'ночь', hours: 3 }), context);
        assert.equal(sleeper.state, 'спит');

        const active = createHuman(0.9);
        active.receive(createMessage(TIME_REPORT, { phase: 'день', hours: 14 }), context);
        assert.equal(active.state, 'активен');
        assert.equal(active.phase, 'день');
    });

    it('днём состояние выбирается по вероятностям', () => {
        const { context } = createContext();
        const cases: Array<[number, string]> = [
            [0.05, 'в туалете'],
            [0.1, 'принимает пищу'],
            [0.29, 'принимает пищу'],
            [0.3, 'активен'],
            [0.99, 'активен'],
        ];

        for (const [roll, expected] of cases) {
            const agent = createHuman(roll);
            agent.receive(createMessage(TIME_REPORT, { phase: 'день', hours: 12 }), context);
            assert.equal(agent.state, expected, `при roll=${roll}`);
        }
    });

    it('ночью вероятности не применяются', () => {
        const { context } = createContext();
        const agent = createHuman(0.05);

        agent.receive(createMessage(TIME_REPORT, { phase: 'ночь', hours: 2 }), context);

        assert.equal(agent.state, 'спит');
    });

    it('пересылает поиск каталогу и указывает свой адрес для ответа', () => {
        const agent = createHuman();
        const { context, sent } = createContext('HumanAgent-7');

        agent.receive(createMessage(CATALOG_SEARCH, { criteria: { profession: 'врач' } }), context);

        assert.equal(sent.length, 1);
        assert.equal(sent[0]?.to, HUMAN_CATALOG_AGENT_ID);
        assert.equal(sent[0]?.type, CATALOG_SEARCH);
        assert.deepEqual(sent[0]?.payload, { criteria: { profession: 'врач' }, replyTo: 'HumanAgent-7' });
    });

    it('печатает результат поиска', () => {
        const agent = createHuman();
        const { context, log } = createContext();
        const anna = { id: 'HumanAgent-2', name: 'Анна', gender: 'женщина', profession: 'врач' };

        agent.receive(createMessage(CATALOG_RESULT, { criteria: {}, matches: [anna] }), context);
        agent.receive(createMessage(CATALOG_RESULT, { criteria: {}, matches: [] }), context);

        assert.match(log[0] ?? '', /нашёл: Анна \(врач\)/);
        assert.match(log[1] ?? '', /никого не нашёл/);
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = createHuman();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });

    it('выбирает свойства случайно, если их не задали', () => {
        const first = new HumanAgent({ random: () => 0 });
        const last = new HumanAgent({ random: () => 0.99 });

        assert.equal(first.name, 'Иван');
        assert.equal(last.name, 'Ольга');
        assert.equal(first.record('HumanAgent-1').profession, 'инженер');
        assert.equal(last.record('HumanAgent-1').profession, 'водитель');
    });

    it('проверяет настройки', () => {
        assert.throws(() => new HumanAgent({ name: '', gender: 'мужчина' }), /name должен быть непустой строкой/);
        assert.throws(() => new HumanAgent({ name: 'Иван', gender: 'робот' }), /gender должен быть/);
        assert.throws(() => new HumanAgent({ profession: '' }), /profession должен быть непустой строкой/);
        assert.throws(() => new HumanAgent({ random: 5 }), /random должен быть функцией/);
    });

    it('по импульсу заново спрашивает время', () => {
        const agent = createHuman();
        const { context, sent } = createContext('HumanAgent-5');

        agent.receive(createMessage(TICK), context);

        assert.deepEqual(sent, [{ to: DAY_AGENT_ID, type: 'time-request', payload: { replyTo: 'HumanAgent-5' } }]);
    });

    it('пересчитывает состояние по каждому импульсу', () => {
        const rolls = [0.9, 0.05];
        const agent = new HumanAgent({
            name: 'Иван',
            gender: 'мужчина',
            profession: 'врач',
            random: () => rolls.shift() ?? 0.9,
        });
        const { context } = createContext();
        agent.receive(createMessage(TIME_REPORT, { phase: 'день', hours: 12 }), context);
        assert.equal(agent.state, 'активен');

        agent.receive(createMessage(TICK), context);
        agent.receive(createMessage(TIME_REPORT, { phase: 'день', hours: 12 }), context);

        assert.equal(agent.state, 'в туалете');
    });

    it('печатает только смену состояния', () => {
        const agent = createHuman(0.9);
        const { context, log } = createContext();

        agent.receive(createMessage(TIME_REPORT, { phase: 'день', hours: 12 }), context);
        agent.receive(createMessage(TIME_REPORT, { phase: 'день', hours: 13 }), context);
        assert.equal(log.length, 1, 'одинаковое состояние повторно не печатается');

        agent.receive(createMessage(TIME_REPORT, { phase: 'ночь', hours: 2 }), context);

        assert.equal(log.length, 2);
        assert.match(log[1] ?? '', /моё состояние: спит/);
    });
});
