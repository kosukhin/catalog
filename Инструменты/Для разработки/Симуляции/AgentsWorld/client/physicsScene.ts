import * as THREE from 'three';
import { bodyColor, boxOf } from './physicsView.ts';
import type { PhysicsState } from '../agents/physicsAgent.ts';

export interface SceneView {
    apply(state: PhysicsState): void;
    dispose(): void;
}

interface Context {
    readonly renderer: THREE.WebGLRenderer;
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly render: () => void;
}

interface Orbit {
    setTarget(point: { readonly x: number; readonly y: number; readonly z: number }): void;
}

function createContext(canvas: HTMLCanvasElement): Context {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1115);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(60, 120, 80);
    scene.add(sun);
    scene.add(new THREE.GridHelper(200, 40, 0x2a3040, 0x1b2130));

    let render = (): void => {};
    const resize = (): void => {
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 500;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
    };
    window.addEventListener('resize', resize);
    render = (): void => {
        renderer.render(scene, camera);
    };
    resize();
    return { renderer, scene, camera, render };
}

function createOrbit(canvas: HTMLCanvasElement, context: Context): Orbit {
    const target = new THREE.Vector3();
    let yaw = 0.9;
    let pitch = 0.55;
    let distance = 120;

    const update = (): void => {
        const cosPitch = Math.cos(pitch);
        context.camera.position.set(
            target.x + distance * cosPitch * Math.sin(yaw),
            target.y + distance * Math.sin(pitch),
            target.z + distance * cosPitch * Math.cos(yaw),
        );
        context.camera.lookAt(target);
        context.render();
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    canvas.addEventListener('pointerdown', (event) => {
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
    });
    canvas.addEventListener('pointerup', () => {
        dragging = false;
    });
    canvas.addEventListener('pointerleave', () => {
        dragging = false;
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!dragging) {
            return;
        }
        yaw -= (event.clientX - lastX) * 0.008;
        pitch = Math.max(-1.4, Math.min(1.4, pitch + (event.clientY - lastY) * 0.008));
        lastX = event.clientX;
        lastY = event.clientY;
        update();
    });
    canvas.addEventListener(
        'wheel',
        (event) => {
            event.preventDefault();
            distance = Math.max(8, Math.min(2000, distance * (1 + Math.sign(event.deltaY) * 0.1)));
            update();
        },
        { passive: false },
    );

    return {
        setTarget: (point): void => {
            target.set(point.x, point.y, point.z);
            update();
        },
    };
}

interface BodyEntry {
    readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
    readonly label: THREE.Sprite;
}

export function createScene(canvas: HTMLCanvasElement): SceneView {
    const context = createContext(canvas);
    const orbit = createOrbit(canvas, context);
    const group = new THREE.Group();
    context.scene.add(group);
    const bodies = new Map<string, BodyEntry>();
    let boundsBox: THREE.LineSegments | null = null;

    const upsert = (id: string, position: { readonly x: number; readonly y: number; readonly z: number }, moving: boolean): void => {
        let entry = bodies.get(id);
        if (entry === undefined) {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.9, 20, 14),
                new THREE.MeshStandardMaterial({ color: bodyColor(id) }),
            );
            const label = makeLabel(id);
            group.add(mesh);
            group.add(label);
            entry = { mesh, label };
            bodies.set(id, entry);
        }
        entry.mesh.position.set(position.x, position.y, position.z);
        entry.mesh.scale.setScalar(moving ? 1.6 : 1);
        entry.mesh.material.color.setHex(moving ? 0xf97316 : bodyColor(id));
        entry.label.position.set(position.x, position.y + 2.4, position.z);
    };

    const apply = (state: PhysicsState): void => {
        orbit.setTarget(boxOf(state.bounds).center);
        if (boundsBox !== null) {
            context.scene.remove(boundsBox);
            boundsBox.geometry.dispose();
            boundsBox = null;
        }
        const box = new THREE.Box3(
            new THREE.Vector3(state.bounds.min.x, state.bounds.min.y, state.bounds.min.z),
            new THREE.Vector3(state.bounds.max.x, state.bounds.max.y, state.bounds.max.z),
        );
        boundsBox = new THREE.Box3Helper(box, 0x3b82f6);
        context.scene.add(boundsBox);

        const seen = new Set<string>();
        for (const body of state.bodies) {
            seen.add(body.id);
            upsert(body.id, body.position, state.moving.includes(body.id));
        }
        for (const [id, entry] of bodies) {
            if (!seen.has(id)) {
                group.remove(entry.mesh);
                group.remove(entry.label);
                entry.mesh.geometry.dispose();
                entry.mesh.material.dispose();
                entry.label.material.map?.dispose();
                entry.label.material.dispose();
                bodies.delete(id);
            }
        }
        context.render();
    };

    return {
        apply,
        dispose: (): void => {
            context.renderer.dispose();
        },
    };
}

function makeLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx !== null) {
        ctx.fillStyle = 'rgba(15, 17, 21, 0.72)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
    sprite.scale.set(9, 2.2, 1);
    return sprite;
}

