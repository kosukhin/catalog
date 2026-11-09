const MIN_DURATION_SECONDS = 0.05;
const MAX_DURATION_SECONDS = 5;

export interface MotionPoint {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface MotionTracker {
    setTarget(id: string, point: MotionPoint, now: number): void;
    position(id: string, now: number): MotionPoint | null;
    prune(seen: ReadonlySet<string>): void;
}

interface Segment {
    readonly start: MotionPoint;
    readonly end: MotionPoint;
    readonly startedAt: number;
    readonly duration: number;
    readonly changedAt: number;
}

export function createMotionTracker(): MotionTracker {
    const segments = new Map<string, Segment>();

    return {
        setTarget: (id, point, now): void => {
            const current = segments.get(id);
            if (current === undefined) {
                segments.set(id, { start: point, end: point, startedAt: now, duration: 0, changedAt: now });
                return;
            }
            if (samePoint(current.end, point)) {
                return;
            }
            segments.set(id, {
                start: positionOf(current, now),
                end: point,
                startedAt: now,
                duration: clamp(now - current.changedAt, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS),
                changedAt: now,
            });
        },
        position: (id, now): MotionPoint | null => {
            const segment = segments.get(id);
            return segment === undefined ? null : positionOf(segment, now);
        },
        prune: (seen): void => {
            for (const id of [...segments.keys()]) {
                if (!seen.has(id)) {
                    segments.delete(id);
                }
            }
        },
    };
}

function positionOf(segment: Segment, now: number): MotionPoint {
    if (segment.duration <= 0) {
        return segment.end;
    }
    const t = clamp((now - segment.startedAt) / segment.duration, 0, 1);
    return {
        x: lerp(segment.start.x, segment.end.x, t),
        y: lerp(segment.start.y, segment.end.y, t),
        z: lerp(segment.start.z, segment.end.z, t),
    };
}

function lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function samePoint(a: MotionPoint, b: MotionPoint): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
}
