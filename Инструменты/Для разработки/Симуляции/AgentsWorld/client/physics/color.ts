import type { Bounds, PhysicsState, Point } from '../../agents/physics/types.ts';

const DEFAULT_COLOR = 0x8b93a1;

const COLORS: ReadonlyArray<{ readonly prefix: string; readonly color: number }> = [
    { prefix: 'HumanAgent', color: 0x4f8ef7 },
    { prefix: 'ToiletAgent', color: 0xb0724a },
    { prefix: 'House', color: 0xd97706 },
    { prefix: 'DayAgent', color: 0xf6c445 },
    { prefix: 'BankAgent', color: 0x22c55e },
];

export function bodyColor(id: string): number {
    return COLORS.find((item) => id.startsWith(item.prefix))?.color ?? DEFAULT_COLOR;
}

export function labelOf(id: string, names: Readonly<Record<string, string>>): string {
    return names[id] ?? id;
}

export function isMoving(id: string, state: PhysicsState): boolean {
    return state.moving.includes(id);
}

export type { Bounds, Point };
