/**
 * HTTP-приложение на express: API дашборда и раздача статики.
 *
 * Модуль ничего не знает про конкретных агентов — он работает с `WorldQuery`
 * (`server/snapshot.ts`): список акторов и умение задать вопрос. Поэтому приложение
 * можно тестировать на заглушке мира, без потоков и агентов.
 *
 * Маршруты:
 *
 * | Маршрут | Что отдаёт |
 * |---|---|
 * | `GET /` | дашборд (`public/index.html`) |
 * | `GET /api/world` | сводка: работает ли мир, сколько потоков, состав по типам, виртуальное время |
 * | `GET /api/agents?page=&pageSize=&search=` | страница агентов с их состоянием |
 */

import express from 'express';
import { fileURLToPath } from 'node:url';
import { takeSnapshot, type AgentSnapshot, type WorldQuery } from './snapshot.ts';
import type { ServerConfig } from './config.ts';

/** Каталог со статикой дашборда. */
const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));

/** Предел размера страницы, чтобы один запрос не вытащил весь мир. */
const MAX_PAGE_SIZE = 200;

/**
 * Собирает express-приложение.
 *
 * @param world мир или его заглушка
 * @param config настройки (порт не используется, нужен размер страницы и адрес часов)
 */
export function createApp(world: WorldQuery, config: ServerConfig): express.Express {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.static(PUBLIC_DIR));

    app.get('/api/world', async (_request, response) => {
        try {
            const snapshot = await takeSnapshot(world, config.clockId);
            response.json({
                running: snapshot.running,
                threadCount: snapshot.threadCount,
                total: snapshot.total,
                byType: snapshot.byType,
                clock: snapshot.clock,
            });
        } catch (error) {
            response.status(500).json({ error: messageOf(error) });
        }
    });

    app.get('/api/agents', async (request, response) => {
        try {
            const snapshot = await takeSnapshot(world, config.clockId);
            const pageSize = clamp(toPositiveInt(request.query.pageSize) ?? config.pageSize, 1, MAX_PAGE_SIZE);
            const filtered = snapshot.agents.filter((agent) => matches(agent, textOf(request.query.search)));
            const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
            const page = clamp(toPositiveInt(request.query.page) ?? 1, 1, pages);
            const start = (page - 1) * pageSize;
            response.json({
                page,
                pageSize,
                pages,
                total: filtered.length,
                items: filtered.slice(start, start + pageSize),
            });
        } catch (error) {
            response.status(500).json({ error: messageOf(error) });
        }
    });

    return app;
}

/** Ищет строку в id, типе и подробностях состояния. */
function matches(agent: AgentSnapshot, query: string): boolean {
    if (query === '') {
        return true;
    }
    const haystack = [agent.id, agent.type, ...Object.values(agent.details).map((value) => String(value ?? ''))];
    return haystack.join(' ').toLowerCase().includes(query.toLowerCase());
}

/** Приводит параметр запроса к строке. */
function textOf(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/** Приводит параметр запроса к положительному целому. */
function toPositiveInt(value: unknown): number | null {
    const parsed = Number(textOf(value));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Ограничивает число диапазоном. */
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/** Достаёт текст ошибки. */
function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
