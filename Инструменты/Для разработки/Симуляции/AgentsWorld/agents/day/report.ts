import type { DayPhase } from './types.ts';

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

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function phaseOf(hours: number, dayStartHour: number, nightStartHour: number): DayPhase {
    return hours >= dayStartHour && hours < nightStartHour ? 'день' : 'ночь';
}

export function buildReport(moment: Date, phase: DayPhase): TimeReport {
    return {
        iso: moment.toISOString(),
        year: moment.getFullYear(),
        month: moment.getMonth() + 1,
        monthName: MONTHS[moment.getMonth()] ?? '',
        dayOfMonth: moment.getDate(),
        weekday: WEEKDAYS[moment.getDay()] ?? '',
        hours: moment.getHours(),
        minutes: moment.getMinutes(),
        phase,
    };
}
