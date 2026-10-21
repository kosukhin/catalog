const TOMBSTONE = Symbol('tombstone');

export function createHashSetOpenAddressing(
    hashFn,
    size,
    probingFn = (iteration) => iteration,
    loadFactor = 0.75
) {
    let capacity = Math.max(1, Math.floor(size));
    let buckets = new Array(capacity);
    let count = 0;
    let tombstones = 0;

    function normalize(index) {
        return ((index % capacity) + capacity) % capacity;
    }

    function bucketIndex(value) {
        return normalize(hashFn(value));
    }

    function probe(value, iteration) {
        return normalize(hashFn(value) + probingFn(iteration));
    }

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
