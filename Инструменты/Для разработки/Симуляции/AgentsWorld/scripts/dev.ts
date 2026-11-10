import { fileURLToPath } from 'node:url';
import { watch } from 'node:fs';
import * as esbuild from 'esbuild';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const CLIENT_DIR = `${ROOT}client`;

const REBUILD_DELAY_MS = 150;

async function buildClient(): Promise<void> {
    try {
        await esbuild.build({
            entryPoints: [`${CLIENT_DIR}/physicsMain.ts`],
            outfile: `${ROOT}server/public/physics.js`,
            bundle: true,
            format: 'esm',
            target: 'es2023',
            logLevel: 'warning',
        });
        console.log('[dev] клиент собран');
    } catch {
        console.log('[dev] клиент не собрался, жду следующей правки');
    }
}

async function main(): Promise<void> {
    await buildClient();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const watcher = watch(CLIENT_DIR, () => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            void buildClient();
        }, REBUILD_DELAY_MS);
    });

    const { startServer } = await import('../server/index.ts');
    const running = await startServer();
    console.log(`[dev] дашборд: ${running.url} (правка client/ пересобирает бандл, правка остального перезапускает сервер)`);

    const shutdown = (): void => {
        watcher.close();
        if (timer !== null) {
            clearTimeout(timer);
        }
        void running.stop().then(() => process.exit(0));
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
}

await main();

