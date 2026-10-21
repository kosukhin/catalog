export const TOMBSTONE = Symbol('tombstone');

// Линейное пробирование: смещение равно номеру итерации.
export function linearProbing(iteration) {
    return iteration;
}

// Квадратичное пробирование: смещение равно квадрату номера итерации.
export function quadraticProbing(iteration) {
    return iteration * iteration;
}

// Экспоненциальное пробирование: смещение растёт степенью двойки.
export function exponentialProbing(iteration) {
    return 2 ** iteration;
}

// Двойное хеширование: смещение равно номеру итерации, умноженному
// на второй хеш значения (для него нужен отдельный hashFn2).
export function createDoubleHashing(hashFn2) {
    return function doubleHashing(iteration, value) {
        return iteration * hashFn2(value);
    };
}

export function createHashSetOpenAddressing(
    hashFn,
    size,
    probingFn = linearProbing,
    loadFactor = 0.75
) {
    let capacity = Math.max(1, Math.floor(size));
    let buckets = new Array(capacity);
    let count = 0;
    let tombstones = 0;

    // OK
    function normalize(index) {
        return ((index % capacity) + capacity) % capacity;
    }

    // ok
    function bucketIndex(value) {
        return normalize(hashFn(value));
    }

    // ok
    function probe(value, iteration) {
        return normalize(hashFn(value) + probingFn(iteration, value));
    }

    // ok
    // Ищет значение по цепочке пробирования. Возвращает индекс или -1.
    function findValue(value) {
        let index = bucketIndex(value);
        for (let iteration = 0; iteration < capacity; iteration++) {
            const bucket = buckets[index];
            if (bucket === undefined) {
                return -1;
            }
            if (bucket !== TOMBSTONE && bucket === value) {
                return index;
            }
            index = probe(value, iteration + 1);
        }
        return -1;
    }

    // Ищет свободное место для вставки (с учётом tombstone). -1 — места нет.
    function findSlot(value) {
        let index = bucketIndex(value);
        let firstTombstone = -1;
        for (let iteration = 0; iteration < capacity; iteration++) {
            const bucket = buckets[index];
            if (bucket === undefined) {
                return firstTombstone !== -1 ? firstTombstone : index;
            }
            if (bucket === TOMBSTONE) {
                if (firstTombstone === -1) {
                    firstTombstone = index;
                }
            }
            index = probe(value, iteration + 1);
        }
        return firstTombstone;
    }

    function rehash(newCapacity) {
        const oldBuckets = buckets;
        capacity = Math.max(1, Math.floor(newCapacity));
        buckets = new Array(capacity);
        tombstones = 0;
        for (const bucket of oldBuckets) {
            if (bucket === undefined || bucket === TOMBSTONE) {
                continue;
            }
            const slot = findSlot(bucket);
            if (slot !== -1) {
                buckets[slot] = bucket;
            }
        }
    }

    function insert(el) {
        const slot = findSlot(el);
        if (slot === -1) {
            rehash(capacity * 2);
            return insert(el);
        }
        if (buckets[slot] === TOMBSTONE) {
            tombstones--;
        }
        buckets[slot] = el;
        count++;
        return true;
    }

    return {
        add(el) {
            if (findValue(el) !== -1) {
                return false;
            }
            if ((count + tombstones + 1) / capacity > loadFactor) {
                rehash(capacity * 2);
            }
            return insert(el);
        },
        contains(el) {
            return findValue(el) !== -1;
        },
        remove(el) {
            const index = findValue(el);
            if (index === -1) {
                return false;
            }
            buckets[index] = TOMBSTONE;
            count--;
            tombstones++;
            if (count === 0 && tombstones > 0) {
                rehash(capacity);
            }
            return true;
        },
        get size() {
            return count;
        },
        get buckets() {
            return buckets;
        },
        get capacity() {
            return capacity;
        },
        get tombstonesCount() {
            return tombstones;
        },
        values() {
            const result = [];
            for (const bucket of buckets) {
                if (bucket !== undefined && bucket !== TOMBSTONE) {
                    result.push(bucket);
                }
            }
            return result;
        },
        clear() {
            buckets = new Array(capacity);
            count = 0;
            tombstones = 0;
        },
    };
}
