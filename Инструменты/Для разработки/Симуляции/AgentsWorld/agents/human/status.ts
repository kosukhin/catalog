import type { DayPhase } from '../dayAgent.ts';
import type { HumanRecord } from '../humanCatalogAgent.ts';
import type { Gender } from '../humanCatalogAgent.ts';
import { readPerson, readProfession, readRandom } from './options.ts';

export type HumanState = 'спит' | 'активен' | 'принимает пищу' | 'идёт в туалет' | 'в туалете' | 'идёт домой';

export type ToiletStatus = 'нет' | 'запросил' | 'идёт' | 'внутри';

export interface HumanStatus {
    readonly name: string;
    readonly gender: Gender;
    readonly profession: string;
    readonly random: () => number;
    phase: DayPhase | null;
    state: HumanState | null;
    bankId: string | null;
    balance: number | null;
    accountPending: boolean;
    house: string | null;
    houseTried: boolean;
    toilet: ToiletStatus;
    toiletPass: boolean;
    walkingToToilet: boolean;
    atToiletDoor: boolean;
    walkingHome: boolean;
}

export function createStatus(options: Readonly<Record<string, unknown>>): HumanStatus {
    const random = readRandom(options.random);
    const person = readPerson(options);
    return {
        name: person.name,
        gender: person.gender,
        profession: readProfession(options.profession, random),
        random,
        phase: null,
        state: null,
        bankId: null,
        balance: null,
        accountPending: false,
        house: null,
        houseTried: false,
        toilet: 'нет',
        toiletPass: false,
        walkingToToilet: false,
        atToiletDoor: false,
        walkingHome: false,
    };
}

export function recordOf(status: HumanStatus, id: string): HumanRecord {
    return { id, name: status.name, gender: status.gender, profession: status.profession };
}

export function describeOf(status: HumanStatus): Readonly<Record<string, unknown>> {
    return {
        name: status.name,
        gender: status.gender,
        profession: status.profession,
        phase: status.phase,
        state: status.state,
        bank: status.bankId,
        balance: status.balance,
        house: status.house,
        toilet: status.toilet,
    };
}
