import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as physics from '../agents/physicsAgent.ts';
import { createMessage, TICK, STATUS_REQUEST, STATUS_REPORT } from '../lib/protocol.ts';
import type { ActorContext } from '../lib/actor.ts';

const {
    PhysicsAgent,
    PHYSICS_AGENT_ID,
    PHYSICS_REGISTER,
    PHYSICS_MOVE,
    PHYSICS_MOVE_TO,
    PHYSICS_REPORT,
    PHYSICS_ARRIVED,
    PHYSICS_POSITION,
    PHYSICS_BODY,
    PHYSICS_LIST,
    PHYSICS_STATE,
    PHYSICS_PLACE,
} = physics;

interface Fixture {
    readonly context: ActorContext;
    readonly log: string[];
    readonly sent: Array<{ to: string; type: string; payload: unknown }>;
}

function createContext(id = PHYSICS_AGENT_ID): Fixture {
    const log: string[] = [];
    const sent: Array<{ to: string; type: string; payload: unknown }> = [];
    const context: ActorContext = {
        id,
        send: (to, message): void => {
            sent.push({ to, type: message.type, payload: message.payload });
        },
        log: (text): void => {
            log.push(text);
        },
    };
    return { context, log, sent };
}

function lastOf(sent: Fixture['sent'], type: string): { readonly to: string; readonly payload: unknown } | undefined {
    return sent.filter((item) => item.type === type).at(-1);
}

const SMALL = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };

const WIDE = { min: { x: 0, y: 0, z: 0 }, max: { x: 40, y: 10, z: 40 } };

const CROWDED = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };

describe('PhysicsAgent', () => {
    it('модуль сообщает тип, адрес и умеет создавать агента', () => {
        assert.equal(physics.type, 'PhysicsAgent');
        assert.match(physics.moduleUrl, /agents\/physicsAgent\.ts$/);
        assert.equal(PHYSICS_AGENT_ID, 'PhysicsAgent-1');
        assert.equal(physics.createAgent(PHYSICS_AGENT_ID, {}).type, 'PhysicsAgent');
    });

    it('регистрирует тело с заданной точкой', () => {
        const agent = new PhysicsAgent({ bounds: SMALL });
        const { context } = createContext();

        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'HumanAgent-1', position: { x: 1, y: 2, z: 3 } }), context);

        assert.equal(agent.bodyCount, 1);
        assert.deepEqual(agent.positionOf('HumanAgent-1'), { x: 1, y: 2, z: 3 });
    });

    it('без точки сам находит свободное место', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, minDistance: 1 });
        const { context } = createContext();

        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A' }), context);
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'B' }), context);

        assert.deepEqual(agent.positionOf('A'), { x: 0, y: 0, z: 0 });
        assert.deepEqual(agent.positionOf('B'), { x: 1, y: 0, z: 0 });
    });

    it('раскладывает тела по плоскости: высота не меняется, свободные места идут по z', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, minDistance: 1, spawnDistance: 2 });
        const { context } = createContext();

        const ids = Array.from({ length: 12 }, (_item, index) => `H${index}`);
        for (const id of ids) {
            agent.receive(createMessage(PHYSICS_REGISTER, { id }), context);
        }

        const positions = ids.map((id) => agent.positionOf(id));
        assert.equal(positions.every((position) => position !== null), true);
        assert.equal(positions.every((position) => position?.y === 0), true);
        assert.deepEqual(
            positions.map((position) => `${position?.x};${position?.z}`),
            ['0;0', '2;0', '4;0', '6;0', '8;0', '10;0', '0;2', '2;2', '4;2', '6;2', '8;2', '10;2'],
        );
    });

    it('не заводит тело вне границ мира', () => {
        const agent = new PhysicsAgent({ bounds: SMALL });
        const { context } = createContext();

        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 50, y: 0, z: 0 } }), context);

        assert.equal(agent.bodyCount, 0);
    });

    it('двигает тело по направлению и дистанции по тикам', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, speed: 5 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE, { id: 'A', direction: { x: 1, y: 0, z: 0 }, distance: 10, replyTo: 'мир' }), context);

        assert.equal((lastOf(sent, PHYSICS_REPORT)?.payload as { accepted?: unknown }).accepted, true);
        agent.receive(createMessage(TICK), context);
        assert.deepEqual(agent.positionOf('A'), { x: 5, y: 0, z: 0 });
        agent.receive(createMessage(TICK), context);

        assert.deepEqual(agent.positionOf('A'), { x: 10, y: 0, z: 0 });
        assert.equal(agent.movingCount, 0);
        assert.equal(lastOf(sent, PHYSICS_ARRIVED)?.to, 'мир');
    });

    it('отказывает, если путь выходит за границы', () => {
        const agent = new PhysicsAgent({ bounds: SMALL });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE, { id: 'A', direction: { x: 1, y: 0, z: 0 }, distance: 100, replyTo: 'мир' }), context);

        const report = lastOf(sent, PHYSICS_REPORT)?.payload as { accepted: boolean; reason: string };
        assert.equal(report.accepted, false);
        assert.match(report.reason, /вне границ/);
        assert.equal(agent.movingCount, 0);
    });

    it('отказывает, если на пути другое тело', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, minDistance: 1 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'B', position: { x: 5, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE, { id: 'A', direction: { x: 1, y: 0, z: 0 }, distance: 10, replyTo: 'мир' }), context);

        const report = lastOf(sent, PHYSICS_REPORT)?.payload as { accepted: boolean; reason: string };
        assert.equal(report.accepted, false);
        assert.match(report.reason, /на пути тело «B»/);
    });

    it('обходит тело на пути и доходит до цели', () => {
        const agent = new PhysicsAgent({ bounds: WIDE, speed: 5, minDistance: 1, arriveDistance: 1 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'B', position: { x: 5, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_PLACE, { id: 'House-A', position: { x: 10, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE_TO, { id: 'A', targetId: 'House-A', replyTo: 'A' }), context);
        assert.equal((lastOf(sent, PHYSICS_REPORT)?.payload as { accepted?: unknown }).accepted, true, 'запрос принимается, даже если путь занят');

        for (let step = 0; step < 20; step += 1) {
            agent.receive(createMessage(TICK), context);
        }

        const position = agent.positionOf('A');
        assert.ok(position);
        assert.ok(position.x > 8, `дошёл до дома, а не встал перед телом B: ${JSON.stringify(position)}`);
        assert.equal(lastOf(sent, PHYSICS_ARRIVED)?.payload && (lastOf(sent, PHYSICS_ARRIVED)?.payload as { reason: string | null }).reason, null);
    });

    it('обход не сбивает тело с плоскости', () => {
        const agent = new PhysicsAgent({ bounds: WIDE, speed: 5, minDistance: 1, arriveDistance: 1 });
        const { context } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'B', position: { x: 5, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_PLACE, { id: 'House-A', position: { x: 10, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_MOVE_TO, { id: 'A', targetId: 'House-A', replyTo: 'A' }), context);

        for (let step = 0; step < 20; step += 1) {
            agent.receive(createMessage(TICK), context);
        }

        assert.equal(agent.positionOf('A')?.y, 0, 'высота при обходе не меняется');
    });

    it('выходит из затора: несколько тел на пути по-прежнему доходят', () => {
        const agent = new PhysicsAgent({ bounds: WIDE, speed: 5, minDistance: 1, arriveDistance: 1 });
        const { context } = createContext();
        for (let index = 1; index <= 5; index += 1) {
            agent.receive(createMessage(PHYSICS_REGISTER, { id: `H${index}`, position: { x: (index - 1) * 2, y: 0, z: 0 } }), context);
        }
        agent.receive(createMessage(PHYSICS_PLACE, { id: 'House', position: { x: 20, y: 0, z: 0 } }), context);
        for (let index = 1; index <= 5; index += 1) {
            agent.receive(createMessage(PHYSICS_MOVE_TO, { id: `H${index}`, targetId: 'House', replyTo: `H${index}` }), context);
        }

        for (let step = 0; step < 40; step += 1) {
            agent.receive(createMessage(TICK), context);
        }

        for (let index = 1; index <= 5; index += 1) {
            const position = agent.positionOf(`H${index}`);
            assert.ok(position);
            assert.ok(position.x > 15, `H${index} должен был дойти до дома, а он в ${JSON.stringify(position)}`);
        }
        assert.equal(agent.movingCount, 0, 'все движения завершены');
    });

    it('сообщает, если обойти некуда', () => {
        const agent = new PhysicsAgent({ bounds: CROWDED, speed: 5, minDistance: 1, arriveDistance: 1 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 5, y: 0, z: 5 } }), context);
        for (let x = 0; x <= 10; x += 1) {
            for (let z = 0; z <= 10; z += 1) {
                if (x === 5 && z === 5) {
                    continue;
                }
                if (Math.hypot(x - 5, z - 5) <= 3) {
                    agent.receive(createMessage(PHYSICS_REGISTER, { id: `W${x}-${z}`, position: { x, y: 0, z } }), context);
                }
            }
        }
        agent.receive(createMessage(PHYSICS_PLACE, { id: 'House', position: { x: 9, y: 0, z: 5 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE_TO, { id: 'A', targetId: 'House', replyTo: 'A' }), context);
        for (let step = 0; step < 10; step += 1) {
            agent.receive(createMessage(TICK), context);
        }

        const arrival = lastOf(sent, PHYSICS_ARRIVED)?.payload as { reason: string | null } | undefined;
        assert.match(arrival?.reason ?? '', /обойти некуда/);
    });

    it('идёт к другому телу и останавливается рядом', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, speed: 5, arriveDistance: 1 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'B', position: { x: 10, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE_TO, { id: 'A', targetId: 'B', replyTo: 'B' }), context);
        assert.equal((lastOf(sent, PHYSICS_REPORT)?.payload as { accepted?: unknown }).accepted, true);

        for (let step = 0; step < 5; step += 1) {
            agent.receive(createMessage(TICK), context);
        }

        const position = agent.positionOf('A');
        assert.ok(position);
        assert.ok(Math.hypot(position.x - 10, position.y, position.z) <= 1);
        assert.equal(agent.movingCount, 0);
    });

    it('отказывает на незарегистрированное тело и цель', () => {
        const agent = new PhysicsAgent({ bounds: SMALL });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE, { id: 'нет', direction: { x: 1, y: 0, z: 0 }, distance: 1, replyTo: 'мир' }), context);
        assert.match((lastOf(sent, PHYSICS_REPORT)?.payload as { reason: string }).reason, /не зарегистрировано/);

        agent.receive(createMessage(PHYSICS_MOVE_TO, { id: 'A', targetId: 'нет', replyTo: 'мир' }), context);
        assert.match((lastOf(sent, PHYSICS_REPORT)?.payload as { reason: string }).reason, /тело-цель «нет» не зарегистрировано/);
    });

    it('отказывает на нулевое направление', () => {
        const agent = new PhysicsAgent({ bounds: SMALL });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE, { id: 'A', direction: { x: 0, y: 0, z: 0 }, distance: 5, replyTo: 'мир' }), context);

        assert.match((lastOf(sent, PHYSICS_REPORT)?.payload as { reason: string }).reason, /нулевое направление/);
    });

    it('отвечает на вопрос о позиции', () => {
        const agent = new PhysicsAgent({ bounds: SMALL });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 1, y: 1, z: 1 } }), context);

        agent.receive(createMessage(PHYSICS_POSITION, { id: 'A', replyTo: 'мир' }), context);
        assert.deepEqual(lastOf(sent, PHYSICS_BODY)?.payload, { id: 'A', body: { id: 'A', position: { x: 1, y: 1, z: 1 } } });

        agent.receive(createMessage(PHYSICS_POSITION, { id: 'нет', replyTo: 'мир' }), context);
        assert.deepEqual(lastOf(sent, PHYSICS_BODY)?.payload, { id: 'нет', body: null });
    });

    it('на запрос состояния отдаёт тела, объекты, движения и скорость', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, speed: 7 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);

        agent.receive(createMessage(STATUS_REQUEST, { replyTo: 'мир' }), context);

        assert.deepEqual((lastOf(sent, STATUS_REPORT)?.payload as { details?: unknown }).details, { bodies: 1, objects: 0, moving: 0, speed: 7 });
    });

    it('на незнакомое сообщение отвечает в лог', () => {
        const agent = new PhysicsAgent();
        const { context, log } = createContext();

        agent.receive(createMessage('что-то'), context);

        assert.match(log[0] ?? '', /не знаю, что делать с сообщением «что-то»/);
    });

    it('проверяет настройки', () => {
        assert.throws(() => new PhysicsAgent({ speed: 0 }), /speed должен быть положительным числом/);
        assert.throws(() => new PhysicsAgent({ stepSeconds: -1 }), /stepSeconds должен быть положительным числом/);
        assert.throws(
            () => new PhysicsAgent({ bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: -1, y: 1, z: 1 } } }),
            /bounds.max/,
        );
        assert.throws(() => new PhysicsAgent({ bounds: { min: { x: 0, y: 0, z: 0 } } }), /bounds.max.x/);
    });

    it('отдаёт полное состояние физики по запросу', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, speed: 7 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 1, y: 2, z: 3 } }), context);
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'B', position: { x: 4, y: 5, z: 6 } }), context);
        agent.receive(createMessage(PHYSICS_PLACE, { id: 'House-A', position: { x: 1, y: 2, z: 3 } }), context);
        agent.receive(createMessage(PHYSICS_MOVE, { id: 'A', direction: { x: 1, y: 0, z: 0 }, distance: 1, replyTo: 'мир' }), context);

        agent.receive(createMessage(PHYSICS_LIST, { replyTo: 'мир' }), context);

        const report = lastOf(sent, PHYSICS_STATE);
        assert.equal(report?.to, 'мир');
        const state = report?.payload as { speed: number; moving: string[]; bodies: Array<{ id: string }>; objects: Array<{ id: string }>; bounds: unknown };
        assert.equal(state.speed, 7);
        assert.deepEqual(state.moving, ['A']);
        assert.deepEqual(state.bodies.map((body) => body.id), ['A', 'B']);
        assert.deepEqual(state.objects.map((object) => object.id), ['House-A']);
        assert.deepEqual(state.bounds, SMALL);
    });

    it('ставит объект и позволяет дойти до него, не мешая движению', () => {
        const agent = new PhysicsAgent({ bounds: SMALL, speed: 5, arriveDistance: 1 });
        const { context, sent } = createContext();
        agent.receive(createMessage(PHYSICS_REGISTER, { id: 'A', position: { x: 0, y: 0, z: 0 } }), context);
        agent.receive(createMessage(PHYSICS_PLACE, { id: 'House-A', position: { x: 10, y: 0, z: 0 } }), context);

        agent.receive(createMessage(PHYSICS_MOVE_TO, { id: 'A', targetId: 'House-A', replyTo: 'A' }), context);
        assert.equal((lastOf(sent, PHYSICS_REPORT)?.payload as { accepted?: unknown }).accepted, true);

        for (let step = 0; step < 5; step += 1) {
            agent.receive(createMessage(TICK), context);
        }

        const position = agent.positionOf('A');
        assert.ok(position);
        assert.ok(Math.hypot(position.x - 10, position.y, position.z) <= 1);
        assert.equal(agent.movingCount, 0);
    });

    it('на запрос состояния без обратного адреса пишет в лог', () => {
        const agent = new PhysicsAgent({ bounds: SMALL });
        const { context, log } = createContext();

        agent.receive(createMessage(PHYSICS_LIST, {}), context);

        assert.match(log.at(-1) ?? '', /без обратного адреса/);
    });
});

