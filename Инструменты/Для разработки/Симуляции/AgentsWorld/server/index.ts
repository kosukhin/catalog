/**
 * Точка входа приложения: поднимает мир, сервер и раздаёт дашборд.
 *
 * Запуск: `npm start` (то же, что `node server/index.ts`).
 *
 * Порядок важен: сначала мир запускается (агенты живут в потоках), потом
 * открывается HTTP-порт. Иначе первые запросы дашборда увидели бы пустой мир.
 *
 * `startServer` возвращает управление после того, как сервер начал слушать порт,
 * и отдаёт объект с `stop()` — поэтому его удобно запускать в тестах на порту 0.
 *
 * Если файл запущен напрямую (`node server/index.ts`), приложение стартует само и
 * печатает адрес дашборда. При импорте из теста ничего не запускается.
 */

import { fileURLToPath } from 'node:url';
import { World } from '../lib/index.ts';
import { createApp } from './app.ts';
import { createServerConfig, type ServerConfig } from './config.ts';

/** Запущенное приложение. */
export interface RunningServer {
    readonly world: World;
    readonly config: ServerConfig;
    /** Адрес дашборда, например `http://localhost:3000`. */
    readonly url: string;
    /** Останавливает сервер и мир. */
    stop(): Promise<void>;
}

/**
 * Запускает мир и HTTP-сервер.
 *
 * @param config настройки; по умолчанию читаются из окружения
 */
export async function startServer(config: ServerConfig = createServerConfig()): Promise<RunningServer> {
    const world = new World(config.population);
    await world.run();

    const app = createApp(world, config);
    const server = app.listen(config.port);
    await new Promise<void>((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });

    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : config.port;

    return {
        world,
        config,
        url: `http://localhost:${port}`,
        async stop(): Promise<void> {
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
            await world.stop();
        },
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    void startServer()
        .then((running) => {
            console.log(`AgentsWorld: ${running.world.actors.length} агентов на ${running.world.threadCount} потоках`);
            console.log(`дашборд: ${running.url}`);
        })
        .catch((error: unknown) => {
            console.error('не удалось запустить приложение:', error);
            process.exitCode = 1;
        });
}
