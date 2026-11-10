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
