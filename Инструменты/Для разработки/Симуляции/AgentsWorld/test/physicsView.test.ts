import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bodyColor, boxOf, clockLabel, formatPoint, isMoving, labelOf, stateRows, statusLine } from '../client/physicsView.ts';

const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 20, z: 30 } };

const state = {
    speed: 5,
    stepSeconds: 1,
    minDistance: 2,
    arriveDistance: 1,
    bounds,
    bodies: [{ id: 'HumanAgent-1', position: { x: 1, y: 2, z: 3 } }],
    objects: [{ id: 'House-HumanAgent-1', position: { x: 5, y: 0, z: 0 } }],
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

    it('подписывает тело именем, а без имени — адресом', () => {
        const names = { 'HumanAgent-1': 'Иван' };

        assert.equal(labelOf('HumanAgent-1', names), 'Иван');
        assert.equal(labelOf('HumanAgent-2', names), 'HumanAgent-2');
        assert.equal(labelOf('House-HumanAgent-1', {}), 'House-HumanAgent-1');
    });

    it('собирает строки для панели', () => {
        const byLabel = Object.fromEntries(stateRows(state).map((row) => [row.label, row.value]));

        assert.equal(byLabel['скорость'], '5 ед./с');
        assert.equal(byLabel['тел'], '1');
        assert.equal(byLabel['объектов'], '1');
        assert.equal(byLabel['движется'], '1');
        assert.equal(byLabel['мин. дистанция'], '2');
        assert.equal(byLabel['границы x'], '0…10');
        assert.equal(byLabel['границы z'], '0…30');
    });

    it('печатает время мира часами и минутами с фазой', () => {
        const clock = { iso: '', year: 2026, month: 11, monthName: 'ноября', dayOfMonth: 8, weekday: 'воскресенье', hours: 7, minutes: 5, phase: 'день' as const };

        assert.equal(clockLabel(clock), '07:05 · день');
        assert.equal(clockLabel({ ...clock, hours: 23, minutes: 45, phase: 'ночь' }), '23:45 · ночь');
    });

    it('без часов мира показывает прочерк', () => {
        assert.equal(clockLabel(null), 'время мира: —');
    });

    it('собирает строку статуса со временем мира вместо реального', () => {
        const clock = { iso: '', year: 2026, month: 11, monthName: 'ноября', dayOfMonth: 8, weekday: 'воскресенье', hours: 7, minutes: 15, phase: 'день' as const };

        assert.equal(statusLine(3, 1, clock), 'тел: 3 · движется: 1 · 07:15 · день');
        assert.equal(statusLine(0, 0, null), 'тел: 0 · движется: 0 · время мира: —');
    });
});
