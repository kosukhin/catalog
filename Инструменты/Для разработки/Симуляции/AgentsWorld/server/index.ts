import { fileURLToPath } from 'node:url';
import { World } from '../lib/index.ts';
import { createApp } from './app.ts';
import { createServerConfig, type ServerConfig } from './config.ts';

export interface RunningServer {
    readonly world: World;
    readonly config: ServerConfig;
    readonly url: string;
    stop(): Promise<void>;
}

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
