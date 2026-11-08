/**
 * Конфигурация приложения: что запускать и с какими настройками.
 *
 * Это точка сборки мира, как и `scripts/demo.ts`: здесь решается, какие модули
 * агентов подключены и сколько их. Ядро (`lib`) про агентов по-прежнему ничего не
 * знает — состав приходит снаружи одним `Map`.
 *
 * Настройки читаются из переменных окружения, чтобы не переписывать код:
 *
 * | Переменная | По умолчанию | Что задаёт |
 * |---|---|---|
 * | `PORT` | 3000 | порт HTTP-сервера (0 — любой свободный) |
 * | `HUMANS` | 12 | сколько людей запустить в мире |
 * | `PAGE_SIZE` | 20 | размер страницы по умолчанию в API дашборда |
 * | `TIME_SCALE` | 10 | во сколько раз виртуальное время быстрее реального |
 * | `TICK_MS` | 1000 | как часто тикер будит людей, мс |
 */

import * as agents from '../agents/index.ts';
import type { AgentPlugin, PopulationEntry } from '../lib/index.ts';

/** Всё, что нужно приложению для запуска. */
export interface ServerConfig {
    /** Порт HTTP-сервера; 0 — любой свободный (удобно в тестах). */
    readonly port: number;
    /** Сколько людей создавать в мире. */
    readonly humans: number;
    /** Размер страницы по умолчанию для `/api/agents`. */
    readonly pageSize: number;
    /** Во сколько раз виртуальное время быстрее реального. */
    readonly timeScale: number;
    /** Как часто тикер рассылает импульсы, мс. */
    readonly tickMs: number;
    /** Кого будит тикер: адреса людей. */
    readonly recipients: readonly string[];
    /** Адрес агента, у которого спрашивают время. */
    readonly clockId: string;
    /** Состав мира: модуль агента → количество (и настройки). */
    readonly population: Map<AgentPlugin, number | PopulationEntry>;
}

/**
 * Собирает конфигурацию из окружения.
 *
 * @throws если переменная не число или выходит из допустимого диапазона
 */
export function createServerConfig(env: Readonly<Record<string, string | undefined>> = process.env): ServerConfig {
    const port = readInteger(env.PORT, 3000, 0, 65535, 'PORT');
    const humans = readInteger(env.HUMANS, 12, 1, 5000, 'HUMANS');
    const pageSize = readInteger(env.PAGE_SIZE, 20, 1, 200, 'PAGE_SIZE');
    const timeScale = readTimeScale(env.TIME_SCALE, 300);
    const tickMs = readInteger(env.TICK_MS, 1000, 10, 600_000, 'TICK_MS');
    const recipients = Array.from({ length: humans }, (_value, index) => `${agents.humanAgent.type}-${index + 1}`);
    return {
        port,
        humans,
        pageSize,
        timeScale,
        tickMs,
        recipients,
        clockId: agents.dayAgent.DAY_AGENT_ID,
        population: new Map<AgentPlugin, number | PopulationEntry>([
            [agents.dayAgent, { count: 1, options: { timeScale } }],
            [agents.humanCatalogAgent, 1],
            [agents.humanAgent, humans],
            [agents.tickAgent, { count: 1, options: { intervalMs: tickMs, recipients } }],
        ]),
    };
}

/** Читает во сколько раз время быстрее реального. */
function readTimeScale(value: string | undefined, fallback: number): number {
    if (value === undefined || value.trim() === '') {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`TIME_SCALE должен быть положительным числом, получено «${value}»`);
    }
    return parsed;
}

/** Читает целое из окружения с проверкой диапазона. */
function readInteger(value: string | undefined, fallback: number, min: number, max: number, name: string): number {
    if (value === undefined || value.trim() === '') {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`${name} должен быть целым числом от ${min} до ${max}, получено «${value}»`);
    }
    return parsed;
}
