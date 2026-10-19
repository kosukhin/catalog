export function createHashSetOpenAddressing(
    hashFn,
    probingFn,
    size,
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

        },
        contains(el) {

        },
        remove(el) {

        }
    }
}
