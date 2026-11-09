import express from 'express';
import { fileURLToPath } from 'node:url';
import { takePhysics, takeSnapshot, type AgentSnapshot, type WorldQuery } from './snapshot.ts';
import type { ServerConfig } from './config.ts';

const PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));

const MAX_PAGE_SIZE = 200;

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

    app.get('/api/physics', async (_request, response) => {
        try {
            response.json(await takePhysics(world, config.physicsId));
        } catch (error) {
            response.status(500).json({ error: messageOf(error) });
        }
    });

    return app;
}

function matches(agent: AgentSnapshot, query: string): boolean {
    if (query === '') {
        return true;
    }
    const haystack = [agent.id, agent.type, ...Object.values(agent.details).map((value) => String(value ?? ''))];
    return haystack.join(' ').toLowerCase().includes(query.toLowerCase());
}

function textOf(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function toPositiveInt(value: unknown): number | null {
    const parsed = Number(textOf(value));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
