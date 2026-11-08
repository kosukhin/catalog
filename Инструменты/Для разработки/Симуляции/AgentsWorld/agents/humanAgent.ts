/**
 * HumanAgent — один человек в мире.
 *
 * Свойства: имя, пол, профессия. Поведение:
 *
 * 1. При старте человек регистрируется в каталоге людей (`HumanCatalogAgent`),
 *    чтобы другие могли его найти, и спрашивает время у `DayAgent`.
 * 2. По ответу о времени выбирается состояние: ночью человек спит, днём активен.
 * 3. Днём состояние может измениться: с вероятностью 0.1 — «в туалете», ещё с
 *    вероятностью 0.2 — «принимает пищу», иначе остаётся «активен».
 *
 * Человек ничего не вызывает напрямую: он только кладёт сообщения в чужие ящики и
 * читает свой. Адреса справки — каталога и времени — постоянные, потому что те
 * агенты существуют в единственном экземпляре.
 *
 * Адрес для ответа передаётся в `payload.replyTo`: контракт актора не сообщает
 * обработчику, кто прислал сообщение.
 */

import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, TICK, type Message } from '../lib/protocol.ts';
import { DAY_AGENT_ID, TIME_REQUEST, TIME_REPORT, type DayPhase } from './dayAgent.ts';
import {
    CATALOG_REGISTER,
    CATALOG_RESULT,
    CATALOG_SEARCH,
    HUMAN_CATALOG_AGENT_ID,
    type CatalogResult,
    type Gender,
    type HumanRecord,
} from './humanCatalogAgent.ts';

/** Имя типа: под ним агент указывается в составе мира. */
const AGENT_TYPE = 'HumanAgent';

/** Экспорт `type` — часть контракта модуля агента (`lib/agentPlugin.ts`). */
export const type = AGENT_TYPE;

/** Адрес модуля: по нему поток загружает код агента. */
export const moduleUrl = import.meta.url;

/** Состояние человека. */
export type HumanState = 'спит' | 'активен' | 'в туалете' | 'принимает пищу';

/**
 * Граница «в туалете»: вероятность 0.1.
 *
 * Границы записаны готовыми числами, а не суммой: `0.1 + 0.2` в double даёт
 * `0.30000000000000004`, и бросок ровно 0.3 попал бы в «принимает пищу».
 */
const TOILET_LIMIT = 0.1;

/** Граница «принимает пищу»: 0.1 + 0.2 = 0.3. */
const EATING_LIMIT = 0.3;

/** Люди, из которых выбирается имя и пол по умолчанию. */
const PEOPLE: ReadonlyArray<{ readonly name: string; readonly gender: Gender }> = [
    { name: 'Иван', gender: 'мужчина' },
    { name: 'Пётр', gender: 'мужчина' },
    { name: 'Сергей', gender: 'мужчина' },
    { name: 'Анна', gender: 'женщина' },
    { name: 'Мария', gender: 'женщина' },
    { name: 'Ольга', gender: 'женщина' },
];

/** Профессии по умолчанию. */
const PROFESSIONS = ['инженер', 'врач', 'учитель', 'повар', 'водитель'];

/** Настройки агента. */
export interface HumanAgentOptions {
    readonly name: string;
    readonly gender: Gender;
    readonly profession: string;
    /** Источник случайности; по умолчанию `Math.random`. Подменяется в тестах. */
    readonly random: () => number;
}

export class HumanAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #name: string;
    readonly #gender: Gender;
    readonly #profession: string;
    readonly #random: () => number;
    #phase: DayPhase | null = null;
    #state: HumanState | null = null;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#random = readRandom(options.random);
        const person = readPerson(options);
        this.#name = person.name;
        this.#gender = person.gender;
        this.#profession = readProfession(options.profession, this.#random);
    }

    /** Имя человека. */
    get name(): string {
        return this.#name;
    }

    /** Текущее состояние: `null`, пока человек не узнал время. */
    get state(): HumanState | null {
        return this.#state;
    }

    /** Время суток, о котором человеку сообщил `DayAgent`. */
    get phase(): DayPhase | null {
        return this.#phase;
    }

    /** Запись для каталога: то, по чему человека можно найти. */
    record(id: string): HumanRecord {
        return { id, name: this.#name, gender: this.#gender, profession: this.#profession };
    }

    /** Регистрируется в каталоге и спрашивает у DayAgent время. */
    start(context: ActorContext): void {
        context.log(`я ${this.#name}, ${this.#gender}, ${this.#profession}`);
        context.send(HUMAN_CATALOG_AGENT_ID, createMessage(CATALOG_REGISTER, this.record(context.id)));
        this.#askTime(context);
    }

    /** Спрашивает у DayAgent, который сейчас час: ответ снова выставит состояние. */
    #askTime(context: ActorContext): void {
        context.send(DAY_AGENT_ID, createMessage(TIME_REQUEST, { replyTo: context.id }));
    }

    /** Реагирует на время, поиск и его результат. */
    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === TICK) {
            this.#askTime(context);
            return;
        }
        if (message.type === TIME_REPORT) {
            const previous = this.#state;
            this.#applyTime(message.payload);
            if (previous !== this.#state) {
                context.log(`сейчас ${this.#phase}, моё состояние: ${this.#state}`);
            }
            return;
        }
        if (message.type === CATALOG_SEARCH) {
            const criteria = (message.payload as { criteria?: unknown } | undefined)?.criteria;
            context.send(HUMAN_CATALOG_AGENT_ID, createMessage(CATALOG_SEARCH, { criteria, replyTo: context.id }));
            return;
        }
        if (message.type === CATALOG_RESULT) {
            const result = message.payload as CatalogResult | undefined;
            const names = (result?.matches ?? []).map((human) => `${human.name} (${human.profession})`);
            context.log(names.length === 0 ? 'никого не нашёл' : `нашёл: ${names.join(', ')}`);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    /** Что показывать в дашборде: имя, пол, профессия и текущее состояние. */
    protected override describe(): Readonly<Record<string, unknown>> {
        return { name: this.#name, gender: this.#gender, profession: this.#profession, phase: this.#phase, state: this.#state };
    }

    /** Применяет ответ о времени: ночью спит, днём выбирает занятие. */
    #applyTime(payload: unknown): void {
        const report = payload as { phase?: unknown; weekday?: unknown; hours?: unknown; minutes?: unknown } | undefined;
        this.#phase = report?.phase === 'день' ? 'день' : 'ночь';
        this.#state = this.#phase === 'ночь' ? 'спит' : this.#dayState(this.#random());
    }

    /** Состояние днём: туалет, еда или обычная активность. */
    #dayState(roll: number): HumanState {
        if (roll < TOILET_LIMIT) {
            return 'в туалете';
        }
        if (roll < EATING_LIMIT) {
            return 'принимает пищу';
        }
        return 'активен';
    }
}

/** Создаёт агента: этого ждёт загрузчик модуля. */
export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): HumanAgent {
    return new HumanAgent(options);
}

/** Читает человека из настроек или выбирает случайного. */
function readPerson(options: Readonly<Record<string, unknown>>): { name: string; gender: Gender } {
    const name = options.name;
    const gender = options.gender;
    if (name !== undefined || gender !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('name должен быть непустой строкой');
        }
        if (gender !== 'мужчина' && gender !== 'женщина') {
            throw new Error('gender должен быть «мужчина» или «женщина»');
        }
        return { name, gender };
    }
    const random = readRandom(options.random);
    const person = PEOPLE[Math.min(PEOPLE.length - 1, Math.floor(random() * PEOPLE.length))];
    if (person === undefined) {
        throw new Error('список людей пуст');
    }
    return { name: person.name, gender: person.gender };
}

/** Читает профессию или выбирает случайную. */
function readProfession(value: unknown, random: () => number): string {
    if (value === undefined) {
        const profession = PROFESSIONS[Math.min(PROFESSIONS.length - 1, Math.floor(random() * PROFESSIONS.length))];
        if (profession === undefined) {
            throw new Error('список профессий пуст');
        }
        return profession;
    }
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error('profession должен быть непустой строкой');
    }
    return value;
}

/** Читает источник случайности. */
function readRandom(value: unknown): () => number {
    if (value === undefined) {
        return Math.random;
    }
    if (typeof value !== 'function') {
        throw new Error('random должен быть функцией, возвращающей число от 0 до 1');
    }
    return value as () => number;
}

