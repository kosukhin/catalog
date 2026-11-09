import * as agents from '../agents/index.ts';
import { World, createMessage, type AgentPlugin, type PopulationEntry } from '../lib/index.ts';

const recipients = ['HumanAgent-1', 'HumanAgent-2', 'HumanAgent-3'];

const world = new World(
    new Map<AgentPlugin, number | PopulationEntry>([
        [agents.dayAgent, { count: 1, options: { timeScale: 120 } }],
        [agents.humanCatalogAgent, 1],
        [agents.humanAgent, recipients.length],
        [agents.tickAgent, { count: 1, options: { intervalMs: 100, recipients } }],
    ]),
);

console.log(`мир: ${world.actors.map((actor) => actor.id).join(', ')}`);
await world.run();
console.log(`мир запущен на ${world.threadCount} потоках`);

await new Promise((resolve) => setTimeout(resolve, 600));

world.send('мир', 'HumanAgent-1', createMessage(agents.humanCatalogAgent.CATALOG_SEARCH, { criteria: {} }));

await new Promise((resolve) => setTimeout(resolve, 300));

await world.stop();
console.log('мир остановлен');
