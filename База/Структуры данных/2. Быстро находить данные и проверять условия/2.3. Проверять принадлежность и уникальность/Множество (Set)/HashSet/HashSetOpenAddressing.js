export function createHashSetOpenAddressing(
    hashFn,
    size,
    probingFn,
    loadFactor = 0.75
) {
    const buckets = new Array(size);

    function probe() {

    }

    function bucketIndex(value) {
        return hashFn(value) % size;
    }

    return {
        add(el) {
            const index = bucketIndex(el);
            const bucketValue = buckets[index];
            if (bucketValue === undefined || bucketValue === el) {
                buckets[index] = el;
            }
        },
        contains(el) {

        },
        remove(el) {

        }
    }
}
