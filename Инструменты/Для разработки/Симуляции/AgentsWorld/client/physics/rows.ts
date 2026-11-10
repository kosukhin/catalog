import type { PhysicsState } from '../../agents/physics/types.ts';
import type { TimeReport } from '../../agents/day/types.ts';
import { clockLabel, round } from './format.ts';

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

export function statusLine(bodyCount: number, movingCount: number, clock: TimeReport | null): string {
    return `тел: ${bodyCount} · движется: ${movingCount} · ${clockLabel(clock)}`;
}
