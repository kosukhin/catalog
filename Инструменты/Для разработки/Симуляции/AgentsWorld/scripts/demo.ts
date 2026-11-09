import * as agents from '../agents/index.ts';
import { World, createMessage, type AgentPlugin, type PopulationEntry } from '../lib/index.ts';

const world = new World(
    new Map<AgentPlugin, number | PopulationEntry>([
        [agents.dayAgent, { count: 1, options: { timeScale: 120 } }],
        [agents.humanCatalogAgent, 1],
        [agents.physicsAgent, { count: 1, options: { spawnDistance: 5, speed: 100, stepSeconds: 0.1 } }],
        [agents.bankAgent, 1],
        [agents.houseAgent, 1],
        [agents.bulletinBoardAgent, 1],
        [agents.toiletAgent, 1],
        [agents.humanAgent, 3],
        [agents.tickAgent, { count: 1, options: { intervalMs: 100, types: [agents.humanAgent.type, agents.physicsAgent.type, agents.toiletAgent.type] } }],
    ]),
);

console.log(`мир: ${world.actors.map((actor) => actor.id).join(', ')}`);
await world.run();
console.log(`мир запущен на ${world.threadCount} потоках`);

await new Promise((resolve) => setTimeout(resolve, 1500));

world.send('мир', 'HumanAgent-1', createMessage(agents.humanCatalogAgent.CATALOG_SEARCH, { criteria: {} }));

await new Promise((resolve) => setTimeout(resolve, 300));

await world.stop();
console.log('мир остановлен');
