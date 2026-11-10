import type { Bounds, Point } from './types.ts';

export const EPSILON = 1e-9;

export const STALL_STEP = 0.05;

export const STALL_LIMIT = 8;

export const AROUND_ANGLES: readonly number[] = [Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, (2 * Math.PI) / 3, (-2 * Math.PI) / 3];

export function subtract(a: Point, b: Point): Point {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function add(a: Point, b: Point): Point {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale(point: Point, factor: number): Point {
    return { x: point.x * factor, y: point.y * factor, z: point.z * factor };
}

export function rotateOnPlane(point: Point, angle: number): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: point.x * cos - point.z * sin, y: point.y, z: point.x * sin + point.z * cos };
}

export function distanceBetween(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function insideBounds(point: Point, bounds: Bounds): boolean {
    const { min, max } = bounds;
    return point.x >= min.x && point.x <= max.x && point.y >= min.y && point.y <= max.y && point.z >= min.z && point.z <= max.z;
}

export function formatPoint(point: Point): string {
    return `(${round(point.x)}; ${round(point.y)}; ${round(point.z)})`;
}

export function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}
