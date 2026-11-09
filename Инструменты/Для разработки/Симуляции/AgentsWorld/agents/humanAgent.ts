import { AbstractActor, type ActorContext } from '../lib/actor.ts';
import { createMessage, TICK, type Message } from '../lib/protocol.ts';
import * as day from './dayAgent.ts';
import * as catalog from './humanCatalogAgent.ts';
import * as physics from './physicsAgent.ts';
import * as bulletin from './bulletinBoardAgent.ts';
import * as bank from './bankAgent.ts';
import * as house from './houseAgent.ts';
import * as toilet from './toiletAgent.ts';

const AGENT_TYPE = 'HumanAgent';

export const type = AGENT_TYPE;

export const moduleUrl = import.meta.url;

export type HumanState = 'спит' | 'активен' | 'принимает пищу' | 'идёт в туалет' | 'в туалете' | 'идёт домой';

type ToiletStatus = 'нет' | 'запросил' | 'идёт' | 'внутри';

const TOILET_LIMIT = 0.1;

const EATING_LIMIT = 0.3;

const PEOPLE: ReadonlyArray<{ readonly name: string; readonly gender: catalog.Gender }> = [
    { name: 'Иван', gender: 'мужчина' },
    { name: 'Пётр', gender: 'мужчина' },
    { name: 'Сергей', gender: 'мужчина' },
    { name: 'Анна', gender: 'женщина' },
    { name: 'Мария', gender: 'женщина' },
    { name: 'Ольга', gender: 'женщина' },
];

const PROFESSIONS = ['инженер', 'врач', 'учитель', 'повар', 'водитель'];

export interface HumanAgentOptions {
    readonly name: string;
    readonly gender: catalog.Gender;
    readonly profession: string;
    readonly random: () => number;
}

export class HumanAgent extends AbstractActor {
    readonly type = AGENT_TYPE;
    readonly #name: string;
    readonly #gender: catalog.Gender;
    readonly #profession: string;
    readonly #random: () => number;
    #phase: day.DayPhase | null = null;
    #state: HumanState | null = null;
    #bankId: string | null = null;
    #balance: number | null = null;
    #accountPending = false;
    #house: string | null = null;
    #houseTried = false;
    #toilet: ToiletStatus = 'нет';
    #toiletPass = false;
    #walkingToToilet = false;
    #atToiletDoor = false;
    #walkingHome = false;

    constructor(options: Readonly<Record<string, unknown>> = {}) {
        super();
        this.#random = readRandom(options.random);
        const person = readPerson(options);
        this.#name = person.name;
        this.#gender = person.gender;
        this.#profession = readProfession(options.profession, this.#random);
    }

    get name(): string {
        return this.#name;
    }

    get state(): HumanState | null {
        return this.#state;
    }

    get phase(): day.DayPhase | null {
        return this.#phase;
    }

    get bankId(): string | null {
        return this.#bankId;
    }

    get balance(): number | null {
        return this.#balance;
    }

    get houseId(): string | null {
        return this.#house;
    }

    get toiletStatus(): ToiletStatus {
        return this.#toilet;
    }

    record(id: string): catalog.HumanRecord {
        return { id, name: this.#name, gender: this.#gender, profession: this.#profession };
    }

    start(context: ActorContext): void {
        context.log(`я ${this.#name}, ${this.#gender}, ${this.#profession}`);
        context.send(catalog.HUMAN_CATALOG_AGENT_ID, createMessage(catalog.CATALOG_REGISTER, this.record(context.id)));
        context.send(physics.PHYSICS_AGENT_ID, createMessage(physics.PHYSICS_REGISTER, { id: context.id }));
        this.#askTime(context);
    }

    protected override handle(message: Message, context: ActorContext): void {
        if (message.type === TICK) {
            this.#askTime(context);
            this.#retryToilet(context);
            return;
        }
        if (message.type === day.TIME_REPORT) {
            this.#applyTime(message.payload, context);
            return;
        }
        if (message.type === bulletin.BULLETIN_RESULT) {
            this.#onBulletin(message.payload, context);
            return;
        }
        if (message.type === bank.BANK_ACCOUNT) {
            this.#onAccount(message.payload, context);
            return;
        }
        if (message.type === house.HOUSE_REPORT) {
            this.#onHouse(message.payload, context);
            return;
        }
        if (message.type === toilet.TOILET_GRANTED) {
            this.#goToToilet(context);
            return;
        }
        if (message.type === toilet.TOILET_QUEUED) {
            this.#waitForToilet(context);
            return;
        }
        if (message.type === toilet.TOILET_RELEASED) {
            this.#leaveToilet(context);
            return;
        }
        if (message.type === physics.PHYSICS_ARRIVED) {
            this.#onArrived(context);
            return;
        }
        if (message.type === physics.PHYSICS_REPORT) {
            this.#onPhysicsReport(message.payload, context);
            return;
        }
        if (message.type === catalog.CATALOG_SEARCH) {
            this.#forwardSearch(message.payload, context);
            return;
        }
        if (message.type === catalog.CATALOG_RESULT) {
            this.#onSearchResult(message.payload, context);
            return;
        }
        context.log(`не знаю, что делать с сообщением «${message.type}»`);
    }

    protected override describe(): Readonly<Record<string, unknown>> {
        return {
            name: this.#name,
            gender: this.#gender,
            profession: this.#profession,
            phase: this.#phase,
            state: this.#state,
            bank: this.#bankId,
            balance: this.#balance,
            house: this.#house,
            toilet: this.#toilet,
        };
    }

    #askTime(context: ActorContext): void {
        context.send(day.DAY_AGENT_ID, createMessage(day.TIME_REQUEST, { replyTo: context.id }));
    }

    #applyTime(payload: unknown, context: ActorContext): void {
        const report = payload as { phase?: unknown } | undefined;
        const previous = this.#state;
        this.#phase = report?.phase === 'день' ? 'день' : 'ночь';
        this.#decide(context);
        if (previous !== this.#state) {
            context.log(`сейчас ${this.#phase}, моё состояние: ${this.#state}`);
        }
    }

    #decide(context: ActorContext): void {
        if (this.#toilet !== 'нет') {
            this.#state = this.#toilet === 'внутри' ? 'в туалете' : 'идёт в туалет';
            return;
        }
        if (this.#walkingHome) {
            this.#state = 'идёт домой';
            return;
        }
        if (this.#phase === 'ночь') {
            this.#state = 'спит';
            return;
        }
        if (this.#balance === null) {
            this.#state = 'активен';
            if (!this.#accountPending) {
                this.#accountPending = true;
                context.send(bulletin.BULLETIN_BOARD_AGENT_ID, createMessage(bulletin.BULLETIN_FIND, { type: bank.type, replyTo: context.id }));
            }
            return;
        }
        if (this.#house === null) {
            this.#state = 'активен';
            if (!this.#houseTried) {
                this.#houseTried = true;
                context.send(house.HOUSE_AGENT_ID, createMessage(house.HOUSE_BUY, { owner: context.id, bankId: this.#bankId, replyTo: context.id }));
            }
            return;
        }
        const roll = this.#random();
        if (roll < TOILET_LIMIT) {
            this.#startToilet(context);
            return;
        }
        this.#state = roll < EATING_LIMIT ? 'принимает пищу' : 'активен';
    }

    #startToilet(context: ActorContext): void {
        this.#toilet = 'запросил';
        this.#state = 'идёт в туалет';
        context.log('хочу в туалет');
        context.send(toilet.TOILET_AGENT_ID, createMessage(toilet.TOILET_REQUEST, { id: context.id, replyTo: context.id }));
    }

    #waitForToilet(context: ActorContext): void {
        context.log('в списке желающих, иду к туалету');
        this.#walkToToilet(context);
    }

    #goToToilet(context: ActorContext): void {
        this.#toilet = 'идёт';
        this.#toiletPass = true;
        context.log('место моё, иду в туалет');
        this.#walkToToilet(context);
    }

    #walkToToilet(context: ActorContext): void {
        this.#walkingToToilet = true;
        this.#atToiletDoor = false;
        this.#state = 'идёт в туалет';
        context.send(physics.PHYSICS_AGENT_ID, createMessage(physics.PHYSICS_MOVE_TO, { id: context.id, targetId: toilet.TOILET_AGENT_ID, replyTo: context.id }));
    }

    #retryToilet(context: ActorContext): void {
        if (this.#toilet === 'нет' || this.#toilet === 'внутри' || this.#walkingToToilet || this.#atToiletDoor) {
            return;
        }
        this.#walkToToilet(context);
    }

    #leaveToilet(context: ActorContext): void {
        this.#toilet = 'нет';
        this.#toiletPass = false;
        this.#walkingToToilet = false;
        this.#atToiletDoor = false;
        context.log('вышел из туалета');
        if (this.#house !== null) {
            this.#walkingHome = true;
            this.#state = 'идёт домой';
            context.send(physics.PHYSICS_AGENT_ID, createMessage(physics.PHYSICS_MOVE_TO, { id: context.id, targetId: this.#house, replyTo: context.id }));
            return;
        }
        this.#state = 'активен';
    }

    #onArrived(context: ActorContext): void {
        if (this.#walkingHome) {
            this.#walkingHome = false;
            this.#state = 'активен';
            context.log('вернулся домой');
            return;
        }
        if (!this.#walkingToToilet) {
            return;
        }
        this.#walkingToToilet = false;
        if (!this.#toiletPass) {
            this.#atToiletDoor = true;
            this.#state = 'идёт в туалет';
            context.log('стою у туалета, жду место');
            return;
        }
        this.#toiletPass = false;
        this.#toilet = 'внутри';
        this.#state = 'в туалете';
        context.log('я в туалете');
        context.send(toilet.TOILET_AGENT_ID, createMessage(toilet.TOILET_ENTER, { id: context.id }));
    }

    #onPhysicsReport(payload: unknown, context: ActorContext): void {
        const report = payload as { accepted?: unknown; reason?: unknown } | undefined;
        if (report?.accepted === true) {
            return;
        }
        const reason = typeof report?.reason === 'string' ? report.reason : 'отказ физики';
        if (this.#walkingHome) {
            this.#walkingHome = false;
            this.#state = 'активен';
            context.log(`домой не дойти: ${reason}`);
            return;
        }
        if (this.#toilet === 'нет' || this.#toilet === 'внутри') {
            return;
        }
        this.#walkingToToilet = false;
        this.#atToiletDoor = false;
        this.#state = 'идёт в туалет';
        context.log(`до туалета не дойти: ${reason}, попробую ещё`);
    }

    #onBulletin(payload: unknown, context: ActorContext): void {
        const result = payload as { type?: unknown; ids?: unknown } | undefined;
        if (result?.type !== bank.type) {
            return;
        }
        const ids = Array.isArray(result.ids) ? result.ids.filter((item): item is string => typeof item === 'string') : [];
        if (ids.length === 0) {
            this.#accountPending = false;
            context.log('банков не нашлось');
            return;
        }
        const bankId = ids[0] ?? '';
        this.#bankId = bankId;
        context.log(`нашёл банк ${bankId}`);
        context.send(bankId, createMessage(bank.BANK_OPEN, { owner: context.id, replyTo: context.id }));
    }

    #onAccount(payload: unknown, context: ActorContext): void {
        this.#accountPending = false;
        const report = payload as { owner?: unknown; balance?: unknown } | undefined;
        this.#balance = typeof report?.balance === 'number' ? report.balance : null;
        context.log(`счёт открыт, на нём ${this.#balance}`);
    }

    #onHouse(payload: unknown, context: ActorContext): void {
        const report = payload as { houseId?: unknown; accepted?: unknown; reason?: unknown } | undefined;
        if (report?.accepted === true && typeof report.houseId === 'string') {
            this.#house = report.houseId;
            context.log(`купил дом ${this.#house}`);
            return;
        }
        context.log(`не смог купить дом: ${typeof report?.reason === 'string' ? report.reason : 'отказ'}`);
    }

    #forwardSearch(payload: unknown, context: ActorContext): void {
        const criteria = (payload as { criteria?: unknown } | undefined)?.criteria;
        context.send(catalog.HUMAN_CATALOG_AGENT_ID, createMessage(catalog.CATALOG_SEARCH, { criteria, replyTo: context.id }));
    }

    #onSearchResult(payload: unknown, context: ActorContext): void {
        const result = payload as catalog.CatalogResult | undefined;
        const names = (result?.matches ?? []).map((human) => `${human.name} (${human.profession})`);
        context.log(names.length === 0 ? 'никого не нашёл' : `нашёл: ${names.join(', ')}`);
    }
}

export function createAgent(_id: string, options: Readonly<Record<string, unknown>> = {}): HumanAgent {
    return new HumanAgent(options);
}

function readPerson(options: Readonly<Record<string, unknown>>): { name: string; gender: catalog.Gender } {
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

function readRandom(value: unknown): () => number {
    if (value === undefined) {
        return Math.random;
    }
    if (typeof value !== 'function') {
        throw new Error('random должен быть функцией, возвращающей число от 0 до 1');
    }
    return value as () => number;
}

