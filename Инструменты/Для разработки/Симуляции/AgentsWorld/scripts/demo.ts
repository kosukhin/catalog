/**
 * Демонстрация мира из трёх моделей: время, каталог людей и сами люди.
 *
 * Запуск: `npm start` (или `node scripts/demo.ts`).
 *
 * Скрипт — точка сборки мира: он решает, какие модули агентов подключены и сколько
 * их. Сам `World` про агентов ничего не знает.
 *
 * Что видно в логе:
 *
 * 1. `DayAgent` отвечает на вопросы о времени (число, день недели, день или ночь).
 * 2. `HumanAgent` регистрируется в каталоге, спрашивает время и выбирает состояние:
 *    ночью спит, днём активен (иногда в туалете или принимает пищу).
 * 3. Человек ищет других людей через `HumanCatalogAgent` — каталог отвечает ему
 *    списком найденных.
 */

import * as dayAgent from '../agents/dayAgent.ts';
import * as humanAgent from '../agents/humanAgent.ts';
import * as humanCatalogAgent from '../agents/humanCatalogAgent.ts';
import { World, createMessage, type AgentPlugin } from '../lib/index.ts';

const world = new World(
    new Map<AgentPlugin, number>([
        [dayAgent, 1],
        [humanCatalogAgent, 1],
        [humanAgent, 3],
    ]),
);

console.log(`мир: ${world.actors.map((actor) => actor.id).join(', ')}`);
await world.run();
console.log(`мир запущен на ${world.threadCount} потоках`);

await new Promise((resolve) => setTimeout(resolve, 200));

// Человек просит каталог найти всех — каталог отвечает ему же, а не наружу.
world.send('мир', 'HumanAgent-1', createMessage(humanCatalogAgent.CATALOG_SEARCH, { criteria: {} }));

await new Promise((resolve) => setTimeout(resolve, 200));

await world.stop();
console.log('мир остановлен');
