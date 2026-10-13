import { printAsciiTree } from 'binary-tree-printer';

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
class TreeSet {
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
                parent.left = this.createNewNode(el, parent);
            }
        } else if (parent.value < el) {
            if (parent.right) {
                this.add(el, parent.right);
            } else {
                parent.right = this.createNewNode(el, parent);
            }
        }
    }

    createNewNode(el, parent) {
        const newNode = new Node(el, null, null, parent);
        newNode.subtreeHeight = 0;
        this.incrementParentHeight(newNode);
        return newNode;
    }

    incrementParentHeight(node) {
        const rightHeight = node?.right?.subtreeHeight ?? 0;
        const leftHeight = node?.left?.subtreeHeight ?? 0;
        const diff = leftHeight - rightHeight;
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
            node.parent.subtreeHeight = Math.max(
                node.parent?.left?.subtreeHeight ?? 0,
                node.parent?.right?.subtreeHeight ?? 0
            ) + 1;
            this.incrementParentHeight(node.parent);
        }
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
        } else {
            node.parent = rightChild;
            rightChild.parent = null;
            rightChild.left = node;
        }
        node.parent
    }

    rotateRight(node) {

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

console.log('Tree Set')

const tree = new TreeSet(true);

tree.add(1);
console.log(printAsciiTree(tree.leader()));

tree.add(4);
console.log(printAsciiTree(tree.leader()));

tree.add(21);
console.log(printAsciiTree(tree.leader()));

tree.add(7);
console.log(printAsciiTree(tree.leader()));

tree.add(19);
console.log(printAsciiTree(tree.leader()));

tree.add(22);
console.log(printAsciiTree(tree.leader()));

tree.add(25);
console.log(printAsciiTree(tree.leader()));

tree.add(10);
console.log(printAsciiTree(tree.leader()));

tree.add(26);
console.log(printAsciiTree(tree.leader()));

tree.add(27);
console.log(printAsciiTree(tree.leader()));

tree.add(28);
console.log(printAsciiTree(tree.leader()));

tree.add(11);
console.log(printAsciiTree(tree.leader()));

tree.add(12);
console.log(printAsciiTree(tree.leader()));

console.log('have 4', tree.contains(4));
console.log('have 24', tree.contains(24));
