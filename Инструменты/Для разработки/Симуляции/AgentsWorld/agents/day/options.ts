const DEFAULT_TIME_SCALE = 10;

const DEFAULT_DAY_START_HOUR = 6;

const DEFAULT_NIGHT_START_HOUR = 22;

export function readClock(value: unknown): () => Date {
    if (value === undefined) {
        return () => new Date();
    }
    if (typeof value !== 'function') {
        throw new Error('now должен быть функцией, возвращающей Date');
    }
    return value as () => Date;
}

export function readTimeScale(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_TIME_SCALE;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error('timeScale должен быть положительным числом');
    }
    return value;
}

export function readHour(value: unknown, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 23) {
        throw new Error(`${name} должен быть целым часом от 0 до 23`);
    }
    return value;
}

export { DEFAULT_DAY_START_HOUR, DEFAULT_NIGHT_START_HOUR };
