import type { Gender, HumanRecord, SearchCriteria } from './types.ts';

export function readRecord(payload: unknown): HumanRecord {
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

export function readCriteria(value: unknown): SearchCriteria {
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

export function readReplyTo(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function humanParts(criteria: SearchCriteria): string {
    const parts = [
        criteria.name === undefined ? null : `имя «${criteria.name}»`,
        criteria.gender === undefined ? null : `пол «${criteria.gender}»`,
        criteria.profession === undefined ? null : `профессия «${criteria.profession}»`,
    ].filter((part) => part !== null);
    return parts.length === 0 ? 'всех людей' : parts.join(', ');
}
