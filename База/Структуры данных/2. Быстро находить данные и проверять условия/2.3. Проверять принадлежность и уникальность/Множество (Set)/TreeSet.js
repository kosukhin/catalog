class Node {
    _height = 0;
    _parent = null;
    _value = null;

    constructor(value, left, right, parent) {
        this._value = value;
        this.left = left ?? null;
        this.right = right ?? null;
        this._parent = parent;
    }

    get parent() {
        return this._parent;
    }

    set parent(parent) {
        this._parent = parent;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    set subtreeHeight(height) {
        this._height = height;
    }

    get subtreeHeight() {
        return this._height;
    }
}

/**
 * Берем за основу AVL дерево
 */
export class TreeSet {
    // Само дерево
    #leader = null;
    #debug = false;

    constructor(debug = false) {
        this.#debug = debug
    }

    add(el, candidate) {
        if (this.#debug) {
            console.log('-------------------');
            console.log('Add: ', el, candidate?.value);
        }
        if (this.#leader === null) {
            this.#leader = this.createNewNode(el);
            return;
        }
        if (!candidate) {
            candidate = this.#leader;
        }
        if (candidate.value === el) {
            return;
        }
        if (candidate.value > el) {
            if (candidate.left) {
                this.add(el, candidate.left);
            } else {
                this.createNewNode(el, candidate, 'left');
            }
        } else if (candidate.value < el) {
            if (candidate.right) {
                this.add(el, candidate.right);
            } else {
                this.createNewNode(el, candidate, 'right');
            }
        }
    }

    createNewNode(el, parent, slot) {
        const newNode = new Node(el, null, null, parent);
        newNode.subtreeHeight = 0;
        if (parent && slot) {
            parent[slot] = newNode;
            this.rebalance(newNode);
        }
        return newNode;
    }

    rebalance(node) {
        const rightHeight = node?.right?.subtreeHeight ?? 0;
        const leftHeight = node?.left?.subtreeHeight ?? 0;
        const diff = leftHeight - rightHeight;
        node.subtreeHeight = Math.max(rightHeight, leftHeight) + 1;
        if (diff >= 2) {
            // Балансируем левую сторону
            const childLeft = node.left;
            // LR
            if (childLeft.right) {
                this.rotateLeft(childLeft);
                this.rotateRight(node);
                // RR
            } else {
                this.rotateRight(node);
            }
        }
        if (diff <= -2) {
            // Балансируем правую сторону
            const childRight = node.right;
            // RL
            if (childRight.left) {
                this.rotateRight(childRight);
                this.rotateLeft(node);
                // LL
            } else {
                this.rotateLeft(node);
            }
        }
        if (node.parent) {
            this.rebalance(node.parent);
        }
    }

    updateNodeHeight(node) {
        const rightHeight = node?.right?.subtreeHeight ?? 0;
        const leftHeight = node?.left?.subtreeHeight ?? 0;
        node.subtreeHeight = Math.max(rightHeight, leftHeight) + 1;
    }

    leader() {
        return this.#leader;
    }

    parentSlot(node) {
        const parent = node.parent;
        if (!parent) {
            return null;
        }
        return parent.left === node ? 'left' : parent.right === node ? 'right' : null;
    }

    rotateLeft(node) {
        const rightChild = node.right;
        if (!rightChild) {
            throw new Error(`У узла ${node.value} нет правого потомка`)
        }
        const parent = node.parent;
        if (parent) {
            const parentSlot = this.parentSlot(node);
            parent[parentSlot] = rightChild;
        } else {
            this.#leader = rightChild;
            this.#leader.parent = null;
        }
        rightChild.parent = parent;
        rightChild.left = node;
        node.parent = rightChild;
        node.right = null;
        this.updateNodeHeight(node);
        this.updateNodeHeight(rightChild);
        if (parent) {
            this.updateNodeHeight(parent);
        }
    }

    rotateRight(node) {
        const leftChild = node.left;
        if (!leftChild) {
            throw new Error(`У узла ${node.value} нет левого потомка`)
        }
        const parent = node.parent;
        if (parent) {
            const parentSlot = this.parentSlot(node);
            parent[parentSlot] = leftChild;
        } else {
            this.#leader = leftChild;
            this.#leader.parent = null;
        }
        leftChild.parent = parent;
        leftChild.right = node;
        node.parent = leftChild;
        node.left = null;
        this.updateNodeHeight(node);
        this.updateNodeHeight(leftChild);
        if (parent) {
            this.updateNodeHeight(parent);
        }
    }

    delete(el) {

    }

    contains(el, node) {
        if (!node) {
            node = this.#leader;
        }
        if (node.value === el) {
            return true;
        }
        if (el < node.value && node.left) {
            return this.contains(el, node.left);
        }
        if (el > node.value && node.right) {
            return this.contains(el, node.right);
        }
        return false;
    }
}
