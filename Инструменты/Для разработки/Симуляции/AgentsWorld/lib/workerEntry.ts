import { parentPort, threadId, type MessagePort } from 'node:worker_threads';
import { ActorRuntime } from './actorRuntime.ts';
import { loadAgentFactory } from './agentLoader.ts';
import type { ActorAssignment, ActorId, Message, WorkerCommand, WorkerEvent } from './protocol.ts';

const port: MessagePort = requirePort();

function requirePort(): MessagePort {
    if (parentPort === null) {
        throw new Error('workerEntry запускается только как поток worker_threads');
    }
    return parentPort;
}

const runtimes = new Map<ActorId, ActorRuntime>();

function emit(event: WorkerEvent): void {
    port.postMessage(event);
}

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

async function startActors(actors: readonly ActorAssignment[]): Promise<ActorId[]> {
    const started: ActorId[] = [];
    for (const assignment of actors) {
        try {
            const createAgent = await loadAgentFactory(assignment.moduleUrl);
            const actor = createAgent(assignment.id, assignment.options);
            const runtime = new ActorRuntime({ id: assignment.id, actor, ports: createPorts(assignment.id) });
            runtimes.set(assignment.id, runtime);
            await runtime.start();
            started.push(assignment.id);
        } catch (error) {
            runtimes.delete(assignment.id);
            emit({ kind: 'error', actorId: assignment.id, text: error instanceof Error ? error.message : String(error) });
        }
    }
    return started;
}

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
