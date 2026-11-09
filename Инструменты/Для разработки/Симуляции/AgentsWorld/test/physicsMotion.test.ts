import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMotionTracker, type MotionTracker } from '../client/physicsMotion.ts';

const point = (x: number, y = 0, z = 0) => ({ x, y, z });

function xAt(motion: MotionTracker, id: string, now: number): number {
    const current = motion.position(id, now);
    if (current === null) {
        throw new Error(`трекер не знает тело «${id}»`);
    }
    return current.x;
}

describe('physicsMotion', () => {
    it('ставит тело в точку уже на первом сэмпле', () => {
        const motion = createMotionTracker();

        motion.setTarget('HumanAgent-1', point(3, 1, 2), 10);

        assert.deepEqual(motion.position('HumanAgent-1', 10), point(3, 1, 2));
        assert.deepEqual(motion.position('HumanAgent-1', 42), point(3, 1, 2));
    });

    it('не знает тело, которого ещё не видел', () => {
        const motion = createMotionTracker();

        assert.equal(motion.position('HumanAgent-2', 0), null);
    });

    it('двигает тело линейно и доводит ровно к следующему сэмплу', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-1', point(10), 1);

        assert.deepEqual(motion.position('HumanAgent-1', 1), point(0));
        assert.deepEqual(motion.position('HumanAgent-1', 1.25), point(2.5));
        assert.deepEqual(motion.position('HumanAgent-1', 1.5), point(5));
        assert.deepEqual(motion.position('HumanAgent-1', 2), point(10));
        assert.deepEqual(motion.position('HumanAgent-1', 7), point(10));
    });

    it('держит одну скорость на соседних отрезках', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-1', point(4), 1);
        const first = xAt(motion, 'HumanAgent-1', 1.5) - xAt(motion, 'HumanAgent-1', 1.25);

        motion.setTarget('HumanAgent-1', point(8), 2);
        const second = xAt(motion, 'HumanAgent-1', 2.5) - xAt(motion, 'HumanAgent-1', 2.25);

        assert.equal(first, 1);
        assert.equal(second, 1);
    });

    it('описывает только текущий отрезок', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-1', point(4), 1);
        motion.setTarget('HumanAgent-1', point(8), 2);

        assert.deepEqual(motion.position('HumanAgent-1', 1.5), point(4));
    });

    it('не перезапускает отрезок на повторном сэмпле', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-1', point(10), 1);
        motion.setTarget('HumanAgent-1', point(10), 1.2);

        assert.deepEqual(motion.position('HumanAgent-1', 1.5), point(5));
        assert.deepEqual(motion.position('HumanAgent-1', 2), point(10));
    });

    it('не прыгает, если новый сэмпл пришёл раньше конца отрезка', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-1', point(10), 1);

        const before = motion.position('HumanAgent-1', 1.5);
        motion.setTarget('HumanAgent-1', point(30), 1.5);

        assert.deepEqual(motion.position('HumanAgent-1', 1.5), before);
        assert.deepEqual(motion.position('HumanAgent-1', 1.5), point(5));
        assert.deepEqual(motion.position('HumanAgent-1', 2.5), point(30));
    });

    it('не даёт отрезку стать короче минимального', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-1', point(10), 0.01);

        const middle = xAt(motion, 'HumanAgent-1', 0.03);
        assert.ok(middle > 0 && middle < 10, `середина отрезка ${middle}`);
        assert.equal(xAt(motion, 'HumanAgent-1', 0.1), 10);
    });

    it('не даёт отрезку стать длиннее максимального', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-1', point(10), 100);

        assert.equal(xAt(motion, 'HumanAgent-1', 102.5), 5);
        assert.equal(xAt(motion, 'HumanAgent-1', 105), 10);
    });

    it('забывает тела, которых больше нет в состоянии', () => {
        const motion = createMotionTracker();
        motion.setTarget('HumanAgent-1', point(0), 0);
        motion.setTarget('HumanAgent-2', point(1), 0);

        motion.prune(new Set(['HumanAgent-1']));

        assert.notEqual(motion.position('HumanAgent-1', 1), null);
        assert.equal(motion.position('HumanAgent-2', 1), null);
    });
});
