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

    add(el, parent) {
        if (this.#debug) {
            console.log('-------------------');
            console.log('Add: ', el, parent?.value);
        }
        if (this.#leader === null) {
            this.#leader = this.createNewNode(el);
            return;
        }
        if (!parent) {
            parent = this.#leader;
        }
        if (parent.value === el) {
            return;
        }
        if (parent.value > el) {
            if (parent.left) {
                this.add(el, parent.left);
            } else {
                this.createNewNode(el, parent, 'left');
            }
        } else if (parent.value < el) {
            if (parent.right) {
                this.add(el, parent.right);
            } else {
                this.createNewNode(el, parent, 'right');
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
            parent.subtreeHeight -= 1;
        } else {
            this.#leader = rightChild;
            this.#leader.parent = null;
        }
        rightChild.parent = parent;
        rightChild.left = node;
        rightChild.subtreeHeight += 1;
        node.parent = rightChild;
        node.right = null;
        node.subtreeHeight -= 1;
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
            parent.subtreeHeight -= 1;
        } else {
            this.#leader = leftChild;
            this.#leader.parent = null;
        }
        leftChild.parent = parent;
        leftChild.right = node;
        leftChild.subtreeHeight += 1;
        node.parent = leftChild;
        node.left = null;
        node.subtreeHeight -= 1;
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
