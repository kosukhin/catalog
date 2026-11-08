/**
 * Точка входа воркера: то, что исполняется внутри отдельного потока ОС.
 *
 * Поток не знает общего состояния мира — у него только собственный набор
 * рантаймов акторов и канал сообщений `parentPort`. Отсюда три правила:
 *
 * 1. Сообщение актору из своего потока кладётся в его ящик напрямую.
 * 2. Сообщение актору из чужого потока уходит наверх (`deliver`), а адресата
 *    ищет мир: у потока нет доступа к чужим ящикам, и это правильно — иначе
 *    акторы получили бы общую память и перестали быть изолированными.
 * 3. Всё, что актор хочет напечатать, уходит наверх событием `log`, потому что
 *    печать из нескольких потоков в stdout перемешалась бы и её нельзя проверить.
 */

import { parentPort, threadId, type MessagePort } from 'node:worker_threads';
import { ActorRuntime } from './actorRuntime.ts';
import { createDefaultRegistry, type AgentRegistry } from './registry.ts';
import type { ActorAssignment, ActorId, Message, WorkerCommand, WorkerEvent } from './protocol.ts';

/** Канал связи с главным потоком. Явная аннотация нужна, чтобы тип был non-null. */
const port: MessagePort = requirePort();

/** Проверяет, что модуль действительно запущен как поток. */
function requirePort(): MessagePort {
    if (parentPort === null) {
        throw new Error('workerEntry запускается только как поток worker_threads');
    }
    return parentPort;
}

/** Реестр типов: строковый тип из наряда → экземпляр актора. */
const registry: AgentRegistry = createDefaultRegistry();
/** Акторы, живущие в этом потоке. */
const runtimes = new Map<ActorId, ActorRuntime>();

/** Отправляет событие в главный поток. */
function emit(event: WorkerEvent): void {
    port.postMessage(event);
}

/** Создаёт внешние зависимости рантайма для конкретного актора. */
function createPorts(selfId: ActorId): {
    send(to: ActorId, message: Message): void;
    log(text: string): void;
    onError(actorId: ActorId, error: unknown): void;
} {
    return {
        send(to: ActorId, message: Message): void {
            const local = runtimes.get(to);
            if (local) {
                local.deliver(selfId, message);
                return;
            }
            emit({ kind: 'deliver', from: selfId, to, message });
        },
        log(text: string): void {
            emit({ kind: 'log', actorId: selfId, threadId, text });
        },
        onError(actorId: ActorId, error: unknown): void {
            emit({ kind: 'error', actorId, text: error instanceof Error ? error.message : String(error) });
        },
    };
}

/** Создаёт и запускает акторов из наряда. */
async function startActors(actors: readonly ActorAssignment[]): Promise<ActorId[]> {
    const started: ActorId[] = [];
    for (const assignment of actors) {
        if (!registry.has(assignment.type)) {
            emit({ kind: 'error', actorId: assignment.id, text: `неизвестный тип агента «${assignment.type}»` });
            continue;
        }
        const actor = registry.create(assignment.type, assignment.id, assignment.options);
        const runtime = new ActorRuntime({ id: assignment.id, actor, ports: createPorts(assignment.id) });
        runtimes.set(assignment.id, runtime);
        await runtime.start();
        started.push(assignment.id);
    }
    return started;
}

/** Обрабатывает одну команду главного потока. */
async function handle(command: WorkerCommand): Promise<void> {
    if (command.kind === 'start') {
        const actorIds = await startActors(command.actors);
        emit({ kind: 'ready', actorIds });
        return;
    }
    if (command.kind === 'deliver') {
        const target = runtimes.get(command.to);
        if (!target) {
            emit({ kind: 'error', actorId: command.to, text: `в потоке ${threadId} нет агента ${command.to}` });
            return;
        }
        target.deliver(command.from, command.message);
        return;
    }
    for (const runtime of runtimes.values()) {
        await runtime.stop();
    }
    runtimes.clear();
    emit({ kind: 'done' });
}

port.on('message', (command: WorkerCommand) => {
    void handle(command).catch((error: unknown) => {
        emit({ kind: 'error', actorId: null, text: error instanceof Error ? error.message : String(error) });
    });
});
