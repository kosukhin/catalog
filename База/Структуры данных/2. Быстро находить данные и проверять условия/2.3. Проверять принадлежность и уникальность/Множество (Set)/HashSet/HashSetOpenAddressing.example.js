import {
    createHashSetOpenAddressing,
    TOMBSTONE,
} from './HashSetOpenAddressing.js';
import { murmurHash3 } from 'determinism';

const TOMBSTONE_LABEL = '<tombstone>';
const EMPTY_LABEL = '<empty>';

function formatValue(value) {
    if (value === TOMBSTONE) {
        return TOMBSTONE_LABEL;
    }
    if (value === undefined) {
        return EMPTY_LABEL;
    }
    return String(value);
}

// Рендерит бакеты хеш-множества в виде текстовой таблицы.
export function renderHashSet(set, title = 'HashSet (open addressing)') {
    const buckets = set.buckets ?? [];
    const capacity = set.capacity ?? buckets.length;
    const indexWidth = String(Math.max(0, capacity - 1)).length;

    const header = [
        'index'.padEnd(indexWidth, ' '),
        'state'.padEnd(9, ' '),
        'value',
    ].join(' | ');

    const lines = [];
    for (let index = 0; index < buckets.length; index++) {
        const value = buckets[index];
        const state = value === TOMBSTONE
            ? 'tombstone'
            : value === undefined
                ? 'empty'
                : 'value';
        const row = `${String(index).padStart(indexWidth, ' ')} | ${state.padEnd(9, ' ')} | ${formatValue(value)}`;
        lines.push(row);
    }

    const summary = [
        `capacity: ${capacity}`,
        `size: ${set.size}`,
        `tombstones: ${set.tombstonesCount ?? 0}`,
        `load factor: ${capacity ? (set.size / capacity).toFixed(2) : '0.00'}`,
    ].join(', ');

    return [
        title,
        summary,
        '',
        header,
        '-'.repeat(header.length),
        ...lines,
    ].join('\n');
}

const set = createHashSetOpenAddressing(murmurHash3, 10);

console.log(renderHashSet(set, 'HashSet (open addressing) — пусто'));

set.add('apple');
set.add('banana');
set.add('cherry');
set.add('date');

console.log(renderHashSet(set, 'HashSet (open addressing) — после добавления'));

set.remove('banana');

console.log(renderHashSet(set, 'HashSet (open addressing) — после удаления'));

