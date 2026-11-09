import { loadPhysicsState } from './physicsApi.ts';
import { createScene } from './physicsScene.ts';
import { stateRows } from './physicsView.ts';

const POLL_MS = 700;

export function startPhysicsView(): void {
    const canvas = document.getElementById('scene');
    const hud = document.getElementById('hud');
    const status = document.getElementById('status');
    if (!(canvas instanceof HTMLCanvasElement) || hud === null || status === null) {
        return;
    }
    const view = createScene(canvas);

    const tick = async (): Promise<void> => {
        try {
            const state = await loadPhysicsState('/api/physics');
            view.apply(state);
            hud.innerHTML = stateRows(state)
                .map((row) => `<div class="row"><span>${row.label}</span><b>${row.value}</b></div>`)
                .join('');
            status.textContent = `тел: ${state.bodies.length} · движется: ${state.moving.length} · обновлено ${time()}`;
        } catch (error) {
            status.textContent = `ошибка: ${error instanceof Error ? error.message : String(error)}`;
        }
    };

    void tick();
    setInterval(() => void tick(), POLL_MS);
}

function time(): string {
    return new Date().toLocaleTimeString('ru-RU');
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPhysicsView);
    } else {
        startPhysicsView();
    }
}
