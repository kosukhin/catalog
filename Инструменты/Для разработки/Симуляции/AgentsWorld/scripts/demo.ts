/**
 * Демонстрация: мир из шести EchoAgent.
 *
 * Запуск: `npm start` (или `node scripts/demo.ts`).
 *
 * Здесь видно, как собирается мир: скрипт импортирует модуль агента и передаёт его
 * в `World`. Сам `World` про агентов ничего не знает — ему дают модуль, из которого
 * он берёт имя типа и адрес кода.
 *
 * В логе видно главное — агенты живут в разных потоках: у каждой строки указан
 * `threadId`, и этих идентификаторов столько же, сколько потоков поднял мир.
 */

import * as echoAgent from '../agents/echoAgent.ts';
import { World } from '../lib/index.ts';

const world = new World(new Map([[echoAgent, 6]]));

console.log(`мир: ${world.actors.length} агентов`);
await world.run();
console.log(`мир запущен на ${world.threadCount} потоках`);

await new Promise((resolve) => setTimeout(resolve, 300));

await world.stop();
console.log('мир остановлен');
