import type { Bounds, Point } from '../../agents/physics/types.ts';
import type { TimeReport } from '../../agents/day/types.ts';

export function boxOf(bounds: Bounds): { readonly size: Point; readonly center: Point } {
    return {
        size: { x: bounds.max.x - bounds.min.x, y: bounds.max.y - bounds.min.y, z: bounds.max.z - bounds.min.z },
        center: { x: (bounds.min.x + bounds.max.x) / 2, y: (bounds.min.y + bounds.max.y) / 2, z: (bounds.min.z + bounds.max.z) / 2 },
    };
}

export function formatPoint(point: Point): string {
    return `${round(point.x)}; ${round(point.y)}; ${round(point.z)}`;
}

export function clockLabel(clock: TimeReport | null): string {
    if (clock === null) {
        return 'время мира: —';
    }
    return `${pad(clock.hours)}:${pad(clock.minutes)} · ${clock.phase}`;
}

export function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}
