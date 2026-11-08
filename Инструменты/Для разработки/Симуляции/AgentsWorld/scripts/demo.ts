/**
 * Демонстрация: мир из шести EchoAgent.
 *
 * Запуск: `npm start` (или `node scripts/demo.ts`).
 *
 * В логе видно главное — агенты живут в разных потоках: у каждой строки указан
 * `threadId`, и этих идентификаторов столько же, сколько потоков поднял мир.
 */

import { ECHO_AGENT_TYPE, World } from '../lib/index.ts';

const agents = 6;
const world = new World({ [ECHO_AGENT_TYPE]: agents });

console.log(`мир: ${world.actors.length} агентов`);
await world.run();
console.log(`мир запущен на ${world.threadCount} потоках`);

await new Promise((resolve) => setTimeout(resolve, 300));

await world.stop();
console.log('мир остановлен');
