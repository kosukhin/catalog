import type { ActorId } from './message.ts';

export const WORLD_ID = 'мир';

export const STATUS_REQUEST = 'status-request';

export const STATUS_REPORT = 'status-report';

export const TICK = 'tick';

export interface StatusReport {
    readonly id: ActorId;
    readonly type: string;
    readonly details: Readonly<Record<string, unknown>>;
}
