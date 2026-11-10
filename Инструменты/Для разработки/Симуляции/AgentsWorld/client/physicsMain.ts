import { loadAgentNames, loadPhysicsState, loadWorldClock } from './physicsApi.ts';
import { createScene } from './physicsScene.ts';
import { stateRows, statusLine } from './physicsView.ts';
import type { TimeReport } from '../agents/dayAgent.ts';

const POLL_MS = 400;

const NAMES_POLL_MS = 2000;

const CLOCK_POLL_MS = 1000;

export function startPhysicsView(): void {
    const canvas = document.getElementById('scene');
    const hud = document.getElementById('hud');
    const status = document.getElementById('status');
    if (!(canvas instanceof HTMLCanvasElement) || hud === null || status === null) {
        return;
    }
    const view = createScene(canvas);
    const latest = { bodyCount: 0, movingCount: 0, clock: null as TimeReport | null };

    const renderStatus = (): void => {
        status.textContent = statusLine(latest.bodyCount, latest.movingCount, latest.clock);
    };

    const names = async (): Promise<void> => {
        try {
            view.setNames(await loadAgentNames('/api/agents?pageSize=200'));
        } catch {
            return;
        }
    };

    const clock = async (): Promise<void> => {
        try {
            latest.clock = await loadWorldClock('/api/clock');
        } catch {
            latest.clock = null;
        }
        renderStatus();
    };

    const tick = async (): Promise<void> => {
        try {
            const state = await loadPhysicsState('/api/physics');
            view.apply(state);
            hud.innerHTML = stateRows(state)
                .map((row) => `<div class="row"><span>${row.label}</span><b>${row.value}</b></div>`)
                .join('');
            latest.bodyCount = state.bodies.length;
            latest.movingCount = state.moving.length;
            renderStatus();
        } catch (error) {
            status.textContent = `ошибка: ${error instanceof Error ? error.message : String(error)}`;
        }
    };

    void names();
    setInterval(() => void names(), NAMES_POLL_MS);
    void clock();
    setInterval(() => void clock(), CLOCK_POLL_MS);
    void tick();
    setInterval(() => void tick(), POLL_MS);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPhysicsView);
    } else {
        startPhysicsView();
    }
}
