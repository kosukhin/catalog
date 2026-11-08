/**
 * Демонстрация мира из моделей: время, тикер, каталог людей и сами люди.
 *
 * Запуск: `npm run demo` (то же, что `node scripts/demo.ts`). Сервер с дашбордом
 * запускается иначе — `npm start`.
 *
 * Скрипт — точка сборки мира: он решает, какие модули агентов подключены и с
 * какими настройками. Сам `World` про агентов ничего не знает.
 *
 * Что видно в логе:
 *
 * 1. `TickAgent` каждые 100 мс шлёт людям импульс `tick`.
 * 2. Человек по импульсу заново спрашивает время у `DayAgent` и пересчитывает
 *    состояние; в лог попадает только смена состояния.
 * 3. Время идёт в 120 раз быстрее реального, поэтому состояния меняются заметно.
 * 4. Человек ищет других людей через `HumanCatalogAgent`.
 */

import * as agents from '../agents/index.ts';
import { World, createMessage, type AgentPlugin, type PopulationEntry } from '../lib/index.ts';

/** Кого будит тикер: адреса людей из состава мира. */
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

// Человек просит каталог найти всех — каталог отвечает ему же, а не наружу.
world.send('мир', 'HumanAgent-1', createMessage(agents.humanCatalogAgent.CATALOG_SEARCH, { criteria: {} }));

await new Promise((resolve) => setTimeout(resolve, 300));

await world.stop();
console.log('мир остановлен');
