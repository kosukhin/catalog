/**
 * Барьер — точка, где оба агента встречаются после чтения баланса.
 *
 * Зачем он нужен: агенты живут в разных потоках ОС, и предсказать, кто из них
 * первым дойдёт до `UPDATE`, нельзя. Без барьера гонка «повезёт / не повезёт»
 * воспроизводилась бы через раз. Барьер гарантирует, что обе транзакции уже
 * прочитали баланс, и только после этого разрешает запись — как в реальном
 * приложении, где между чтением и записью выполняется бизнес-логика.
 *
 * Реализация — файловая, потому что память у потоков своя: общий у них только
 * каталог на диске. Каждый участник кладёт туда файл-маркер, а потом ждёт,
 * пока маркеров не станет столько же, сколько участников.
 */

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { sleep } from './sleep.ts';

/** Как часто перечитывать каталог с маркерами, мс. */
const POLL_INTERVAL_MS = 5;

/** Параметры барьера. */
export interface BarrierOptions {
    /** Каталог с маркерами; у каждого прогона свой. */
    readonly dir: string;
    /** Имя барьера: маркеры разных раундов не должны смешиваться. */
    readonly name: string;
    /** Сколько участников должно дойти до барьера. */
    readonly expected: number;
    /** Сколько ждать остальных, мс. */
    readonly timeoutMs: number;
}

export class FileBarrier {
    readonly #options: BarrierOptions;
    /** Барьер одноразовый: повтор транзакции уже не ждёт второго агента. */
    #passed = false;

    constructor(options: BarrierOptions) {
        if (options.expected < 1) {
            throw new Error('барьеру нужен хотя бы один участник');
        }
        this.#options = options;
    }

    /** Имя барьера. */
    get name(): string {
        return this.#options.name;
    }

    /** Прошёл ли этот участник барьер раньше. */
    get passed(): boolean {
        return this.#passed;
    }

    /**
     * Встаёт на барьер и ждёт остальных участников.
     *
     * Повторный вызов (например, при повторе транзакции) возвращается сразу:
     * второй агент уже прошёл барьер и ждать его бессмысленно.
     *
     * @param participant кто ждёт — попадает в имя маркера
     * @throws если остальные не собрались за `timeoutMs`
     */
    async wait(participant: string): Promise<void> {
        if (this.#passed) {
            return;
        }
        const { dir, name, expected, timeoutMs } = this.#options;
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, `${name}.${participant}.${randomUUID()}.ready`), '');
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            const ready = await countReady(dir, name);
            if (ready >= expected) {
                this.#passed = true;
                return;
            }
            if (Date.now() > deadline) {
                throw new Error(
                    `барьер «${name}» не собрался за ${timeoutMs} мс: готовы ${ready} из ${expected}`,
                );
            }
            await sleep(POLL_INTERVAL_MS);
        }
    }
}

/** Убирает маркеры прошлых сценариев. */
export async function clearBarriers(dir: string): Promise<void> {
    await rm(dir, { recursive: true, force: true });
}

/** Сколько маркеров этого барьера уже лежит в каталоге. */
async function countReady(dir: string, name: string): Promise<number> {
    const prefix = `${name}.`;
    const files = await readdir(dir);
    return files.filter((file) => file.startsWith(prefix) && file.endsWith('.ready')).length;
}
