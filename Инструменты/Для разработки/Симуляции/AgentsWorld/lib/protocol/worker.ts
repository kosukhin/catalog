import type { ActorId, Message } from './message.ts';

export interface ActorAssignment {
    readonly id: ActorId;
    readonly type: string;
    readonly moduleUrl: string;
    readonly options: Readonly<Record<string, unknown>>;
}

export type WorkerCommand =
    | { readonly kind: 'start'; readonly actors: readonly ActorAssignment[] }
    | { readonly kind: 'deliver'; readonly from: ActorId; readonly to: ActorId; readonly message: Message }
    | { readonly kind: 'stop' };

export type WorkerEvent =
    | { readonly kind: 'ready'; readonly actorIds: readonly ActorId[] }
    | { readonly kind: 'deliver'; readonly from: ActorId; readonly to: ActorId; readonly message: Message }
    | { readonly kind: 'log'; readonly actorId: ActorId; readonly threadId: number; readonly text: string }
    | { readonly kind: 'error'; readonly actorId: ActorId | null; readonly text: string }
    | { readonly kind: 'done' };
