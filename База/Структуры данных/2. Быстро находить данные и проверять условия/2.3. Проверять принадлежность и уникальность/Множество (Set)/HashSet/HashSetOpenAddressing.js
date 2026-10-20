export function createHashSetOpenAddressing(
    hashFn,
    size,
    probingFn,
    loadFactor = 0.75
) {
    const buckets = new Array(size);

    function probe(value, iteration) {
        return (hashFn(value) + probingFn(iteration)) % size;
    }

    function bucketIndex(value) {
        return hashFn(value) % size;
    }

    return {
        add(el) {
            let index = bucketIndex(el);
            let bucketValue = buckets[index];
            if (bucketValue === undefined || bucketValue === el) {
                buckets[index] = el;
            } else {
                let iteration = 1;
                while (bucketValue === undefined || bucketValue === el) {
                    index = probe(el, iteration);
                    bucketValue = buckets[index];
                }
                if (bucketValue === undefined) {
                    bucketValue = el;
                }
            }
        },
        contains(el) {

        },
        remove(el) {

        }
    }
}
