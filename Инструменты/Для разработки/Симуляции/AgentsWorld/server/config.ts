import * as agents from '../agents/index.ts';
import type { Point } from '../agents/physicsAgent.ts';
import type { AgentPlugin } from '../lib/agentPlugin.ts';
import type { PopulationEntry } from '../lib/stats.ts';

const DEFAULT_TOILET_POSITION: Point = { x: 98, y: 0, z: 98 };

export interface ServerConfig {
    readonly port: number;
    readonly humans: number;
    readonly pageSize: number;
    readonly timeScale: number;
    readonly tickMs: number;
    readonly clockId: string;
    readonly physicsId: string;
    readonly toiletPosition: Point;
    readonly population: Map<AgentPlugin, number | PopulationEntry>;
}

export function createServerConfig(env: Readonly<Record<string, string | undefined>> = process.env): ServerConfig {
    const port = readInteger(env.PORT, 3000, 0, 65535, 'PORT');
    const humans = readInteger(env.HUMANS, 42, 1, 5000, 'HUMANS');
    const pageSize = readInteger(env.PAGE_SIZE, 20, 1, 200, 'PAGE_SIZE');
    const timeScale = readTimeScale(env.TIME_SCALE, 50);
    const tickMs = readInteger(env.TICK_MS, 1000, 10, 600_000, 'TICK_MS');
    const toiletPosition = readToiletPosition(env.TOILET_POSITION);
    return {
        port,
        humans,
        pageSize,
        timeScale,
        tickMs,
        clockId: agents.dayAgent.DAY_AGENT_ID,
        physicsId: agents.physicsAgent.PHYSICS_AGENT_ID,
        toiletPosition,
        population: new Map<AgentPlugin, number | PopulationEntry>([
            [agents.dayAgent, { count: 1, options: { timeScale } }],
            [agents.humanCatalogAgent, 1],
            [agents.physicsAgent, { count: 1, options: { spawnDistance: 5 } }],
            [agents.bankAgent, 1],
            [agents.houseAgent, 1],
            [agents.bulletinBoardAgent, 1],
            [agents.toiletAgent, { count: 1, options: { position: toiletPosition } }],
            [agents.humanAgent, humans],
            [agents.tickAgent, { count: 1, options: { intervalMs: tickMs, types: [agents.humanAgent.type, agents.physicsAgent.type, agents.toiletAgent.type] } }],
        ]),
    };
}

function readToiletPosition(value: string | undefined): Point {
    if (value === undefined || value.trim() === '') {
        return DEFAULT_TOILET_POSITION;
    }
    const parts = value.split(',');
    if (parts.length !== 2 && parts.length !== 3) {
        throw new Error(`TOILET_POSITION должен быть в виде «x,z» или «x,y,z», получено «${value}»`);
    }
    const numbers = parts.map((part) => Number(part.trim()));
    if (numbers.some((number) => !Number.isFinite(number))) {
        throw new Error(`TOILET_POSITION должен состоять из конечных чисел, получено «${value}»`);
    }
    const [first, second, third] = numbers;
    if (third === undefined) {
        return { x: first ?? 0, y: DEFAULT_TOILET_POSITION.y, z: second ?? 0 };
    }
    return { x: first ?? 0, y: second ?? 0, z: third };
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
