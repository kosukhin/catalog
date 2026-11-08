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
 */

import * as dayAgent from '../agents/dayAgent.ts';
import * as humanAgent from '../agents/humanAgent.ts';
import * as humanCatalogAgent from '../agents/humanCatalogAgent.ts';
import type { AgentPlugin } from '../lib/index.ts';

/** Всё, что нужно приложению для запуска. */
export interface ServerConfig {
    /** Порт HTTP-сервера; 0 — любой свободный (удобно в тестах). */
    readonly port: number;
    /** Сколько людей создавать в мире. */
    readonly humans: number;
    /** Размер страницы по умолчанию для `/api/agents`. */
    readonly pageSize: number;
    /** Адрес агента, у которого спрашивают время. */
    readonly clockId: string;
    /** Состав мира: модуль агента → количество. */
    readonly population: Map<AgentPlugin, number>;
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
    return {
        port,
        humans,
        pageSize,
        clockId: dayAgent.DAY_AGENT_ID,
        population: new Map<AgentPlugin, number>([
            [dayAgent, 1],
            [humanCatalogAgent, 1],
            [humanAgent, humans],
        ]),
    };
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
