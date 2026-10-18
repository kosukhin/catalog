
class BucketSet {
    #leader = null;
    #size = 0;

    contains(el) {
        let node = this.#leader;
        while(node) {
            if (node.value === el) {
                return true;
            }
            node = node.child;
        }
        return false;
    }

    add(el) {
        let node = this.#leader;
        while(node) {
            if (node.value === el) {
                return;
            }
            if (!node.child) {
                node.child = new Node(el);
                this.#size += 1;
            }
            node = node.child;
        }
    }

    remove(el) {
        let node = this.#leader;
        let parent = null;
        while(node) {
            if (node.value === el) {
                if (parent) {
                    parent.child = node.child ?? null;
                } else {
                    this.#leader = node.child ?? null;
                }
                return;
            }
            parent = node;
            node = node.child;
        }
    }

    elements() {
        const elements = [];
        let node = this.#leader;
        while(node) {
            elements.push(node.value);
            node = node.child;
        }
        return elements;
    }

    size() {
        return this.#size;
    }
}

class Node {
    #child = null;

    constructor(value) {
        this.value = value;
    }

    set child(child) {
        this.#child = child;
    }

    get child() {
        return this.#child;
    }
}


export class HashSetSeparateChaining {
    #buckets = null;

    constructor(
        hashFunction,
        size,
        loadFactor = 0.75
    ) {
        this.hashFunction = hashFunction;
        this.size = size;
        this.loadFactor = loadFactor;
        this.#buckets = new Array(size);
    }

    add(el) {
        const bucketNumber = this.bucketNumber(this.hashFunction(el));
        if (!this.#buckets[bucketNumber]) {
            this.#buckets[bucketNumber] = new BucketSet();
        }
        this.#buckets[bucketNumber].add(el);
        if (this.#rearrangeInvariant()) {
            this.#rearrange();
        }
    }

    contains(el) {
        const bucketNumber = this.bucketNumber(this.hashFunction(el));
        if (!this.#buckets[bucketNumber]) {
            return false;
        }
        return this.#buckets[bucketNumber].contains(el);
    }

    remove(el) {
        const bucketNumber = this.bucketNumber(this.hashFunction(el));
        if (this.#buckets[bucketNumber]) {
            this.#buckets[bucketNumber].remove(el);
        }
    }

    bucketNumber(hashIndex) {
        return hashIndex % this.size;
    }

    elementsCount() {
        let size = 0;
        this.#buckets.forEach(b => {
            if (b) {
                size += b.size();
            }
        });
        return size;
    }

    #rearrangeInvariant() {
        const threshold = this.size * this.loadFactor;
        return this.elementsCount() >= threshold;
    }

    #rearrange() {
        const oldBuckets = this.#buckets;
        this.size = this.size * 2;
        this.#buckets = new Array(this.size);
        oldBuckets.forEach(bucket => {
            if (bucket) {
                bucket.elements().forEach(el => {
                    this.add(el);
                })
            }
        });
    }
}
