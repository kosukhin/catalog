export type DayPhase = 'день' | 'ночь';

export interface TimeReport {
    readonly iso: string;
    readonly year: number;
    readonly month: number;
    readonly monthName: string;
    readonly dayOfMonth: number;
    readonly weekday: string;
    readonly hours: number;
    readonly minutes: number;
    readonly phase: DayPhase;
}
