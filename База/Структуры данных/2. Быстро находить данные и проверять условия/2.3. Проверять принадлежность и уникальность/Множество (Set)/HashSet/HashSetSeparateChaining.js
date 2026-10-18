
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

    }

    contains(el) {

    }

    remove(el) {

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

    }
}
