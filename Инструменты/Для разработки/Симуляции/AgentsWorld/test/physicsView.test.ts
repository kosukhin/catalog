import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bodyColor, boxOf, formatPoint, isMoving, stateRows } from '../client/physicsView.ts';

const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 20, z: 30 } };

const state = {
    speed: 5,
    stepSeconds: 1,
    minDistance: 2,
    arriveDistance: 1,
    bounds,
    bodies: [{ id: 'HumanAgent-1', position: { x: 1, y: 2, z: 3 } }],
    moving: ['HumanAgent-1'],
};

describe('physicsView', () => {
    it('даёт цвет по типу тела', () => {
        assert.equal(bodyColor('HumanAgent-1'), 0x4f8ef7);
        assert.equal(bodyColor('ToiletAgent-1'), 0xb0724a);
        assert.equal(bodyColor('Неизвестный-1'), 0x8b93a1);
    });

    it('сообщает, движется ли тело', () => {
        assert.equal(isMoving('HumanAgent-1', state), true);
        assert.equal(isMoving('HumanAgent-2', state), false);
    });

    it('считает размер и центр границ', () => {
        assert.deepEqual(boxOf(bounds), { size: { x: 10, y: 20, z: 30 }, center: { x: 5, y: 10, z: 15 } });
    });

    it('печатает точку', () => {
        assert.equal(formatPoint({ x: 1.234, y: 0, z: -5 }), '1.23; 0; -5');
    });

    it('собирает строки для панели', () => {
        const byLabel = Object.fromEntries(stateRows(state).map((row) => [row.label, row.value]));

        assert.equal(byLabel['скорость'], '5 ед./с');
        assert.equal(byLabel['тел'], '1');
        assert.equal(byLabel['движется'], '1');
        assert.equal(byLabel['мин. дистанция'], '2');
        assert.equal(byLabel['границы x'], '0…10');
        assert.equal(byLabel['границы z'], '0…30');
    });
});
