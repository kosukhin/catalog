import type { Gender } from '../humanCatalogAgent.ts';

export const TOILET_LIMIT = 0.001;

export const EATING_LIMIT = 0.3;

const PEOPLE: ReadonlyArray<{ readonly name: string; readonly gender: Gender }> = [
    { name: 'Иван', gender: 'мужчина' },
    { name: 'Пётр', gender: 'мужчина' },
    { name: 'Сергей', gender: 'мужчина' },
    { name: 'Анна', gender: 'женщина' },
    { name: 'Мария', gender: 'женщина' },
    { name: 'Ольга', gender: 'женщина' },
];

const PROFESSIONS = ['инженер', 'врач', 'учитель', 'повар', 'водитель'];

export function readRandom(value: unknown): () => number {
    if (value === undefined) {
        return Math.random;
    }
    if (typeof value !== 'function') {
        throw new Error('random должен быть функцией, возвращающей число от 0 до 1');
    }
    return value as () => number;
}

export function readPerson(options: Readonly<Record<string, unknown>>): { name: string; gender: Gender } {
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

export function readProfession(value: unknown, random: () => number): string {
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
