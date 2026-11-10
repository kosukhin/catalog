export interface Point {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface PhysicsBody {
    readonly id: string;
    readonly position: Point;
}

export interface Bounds {
    readonly min: Point;
    readonly max: Point;
}

export interface MoveReport {
    readonly id: string;
    readonly accepted: boolean;
    readonly reason: string | null;
    readonly position: Point;
}

export interface ArrivalReport {
    readonly id: string;
    readonly position: Point;
    readonly reason: string | null;
}

export interface PhysicsState {
    readonly speed: number;
    readonly stepSeconds: number;
    readonly minDistance: number;
    readonly arriveDistance: number;
    readonly bounds: Bounds;
    readonly bodies: readonly PhysicsBody[];
    readonly objects: readonly PhysicsBody[];
    readonly moving: readonly string[];
}

export interface Move {
    readonly kind: 'segment' | 'pursue';
    readonly goal: Point | null;
    readonly targetId: string | null;
    readonly requester: string | null;
    detour: Point | null;
    best: number;
    stalled: number;
}

export interface PhysicsStatus {
    readonly speed: number;
    readonly stepSeconds: number;
    readonly minDistance: number;
    readonly spawnDistance: number;
    readonly arriveDistance: number;
    readonly bounds: Bounds;
    readonly bodies: Map<string, Point>;
    readonly objects: Map<string, Point>;
    readonly moves: Map<string, Move>;
}
