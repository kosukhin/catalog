import { distanceBetween, formatPoint, insideBounds } from './geometry.ts';
import type { PhysicsStatus, Point } from './types.ts';

export function nearest(status: PhysicsStatus, point: Point, ignore: readonly string[]): string | null {
    for (const [id, position] of status.bodies) {
        if (!ignore.includes(id) && distanceBetween(point, position) < status.minDistance) {
            return id;
        }
    }
    return null;
}

export function blocked(status: PhysicsStatus, from: Point, to: Point, ignore: readonly string[]): string | null {
    const length = distanceBetween(from, to);
    const samples = Math.max(1, Math.ceil(length / status.minDistance));
    for (let index = 1; index <= samples; index += 1) {
        const ratio = index / samples;
        const point = {
            x: from.x + (to.x - from.x) * ratio,
            y: from.y + (to.y - from.y) * ratio,
            z: from.z + (to.z - from.z) * ratio,
        };
        if (!insideBounds(point, status.bounds)) {
            return `точка ${formatPoint(point)} вне границ мира`;
        }
        const hit = nearest(status, point, ignore);
        if (hit !== null) {
            return `на пути тело «${hit}»`;
        }
    }
    return null;
}

export function freeSpot(status: PhysicsStatus): Point | null {
    const { min, max } = status.bounds;
    const columns = Math.floor((max.x - min.x) / status.spawnDistance);
    const rows = Math.floor((max.z - min.z) / status.spawnDistance);
    for (let iz = 0; iz <= rows; iz += 1) {
        for (let ix = 0; ix <= columns; ix += 1) {
            const point = { x: min.x + ix * status.spawnDistance, y: min.y, z: min.z + iz * status.spawnDistance };
            if (nearest(status, point, []) === null) {
                return point;
            }
        }
    }
    return null;
}
