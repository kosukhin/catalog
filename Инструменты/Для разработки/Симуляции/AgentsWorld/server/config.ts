import * as agents from '../agents/index.ts';
import type { AgentPlugin, PopulationEntry } from '../lib/index.ts';

export interface ServerConfig {
    readonly port: number;
    readonly humans: number;
    readonly pageSize: number;
    readonly timeScale: number;
    readonly tickMs: number;
    readonly clockId: string;
    readonly population: Map<AgentPlugin, number | PopulationEntry>;
}

export function createServerConfig(env: Readonly<Record<string, string | undefined>> = process.env): ServerConfig {
    const port = readInteger(env.PORT, 3000, 0, 65535, 'PORT');
    const humans = readInteger(env.HUMANS, 12, 1, 5000, 'HUMANS');
    const pageSize = readInteger(env.PAGE_SIZE, 20, 1, 200, 'PAGE_SIZE');
    const timeScale = readTimeScale(env.TIME_SCALE, 10);
    const tickMs = readInteger(env.TICK_MS, 1000, 10, 600_000, 'TICK_MS');
    return {
        port,
        humans,
        pageSize,
        timeScale,
        tickMs,
        clockId: agents.dayAgent.DAY_AGENT_ID,
        population: new Map<AgentPlugin, number | PopulationEntry>([
            [agents.dayAgent, { count: 1, options: { timeScale } }],
            [agents.humanCatalogAgent, 1],
            [agents.humanAgent, humans],
            [agents.tickAgent, { count: 1, options: { intervalMs: tickMs, types: [agents.humanAgent.type] } }],
        ]),
    };
}

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
