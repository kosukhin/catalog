import type { Bounds, PhysicsState, Point } from '../agents/physicsAgent.ts';

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

export function isMoving(id: string, state: PhysicsState): boolean {
    return state.moving.includes(id);
}

export function boxOf(bounds: Bounds): { readonly size: Point; readonly center: Point } {
    return {
        size: {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z,
        },
        center: {
            x: (bounds.min.x + bounds.max.x) / 2,
            y: (bounds.min.y + bounds.max.y) / 2,
            z: (bounds.min.z + bounds.max.z) / 2,
        },
    };
}

export function formatPoint(point: Point): string {
    return `${round(point.x)}; ${round(point.y)}; ${round(point.z)}`;
}

export function stateRows(state: PhysicsState): ReadonlyArray<{ readonly label: string; readonly value: string }> {
    return [
        { label: 'скорость', value: `${state.speed} ед./с` },
        { label: 'шаг', value: `${state.stepSeconds} с` },
        { label: 'тел', value: String(state.bodies.length) },
        { label: 'объектов', value: String(state.objects.length) },
        { label: 'движется', value: String(state.moving.length) },
        { label: 'мин. дистанция', value: String(state.minDistance) },
        { label: 'дистанция прибытия', value: String(state.arriveDistance) },
        { label: 'границы x', value: `${round(state.bounds.min.x)}…${round(state.bounds.max.x)}` },
        { label: 'границы y', value: `${round(state.bounds.min.y)}…${round(state.bounds.max.y)}` },
        { label: 'границы z', value: `${round(state.bounds.min.z)}…${round(state.bounds.max.z)}` },
    ];
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}
