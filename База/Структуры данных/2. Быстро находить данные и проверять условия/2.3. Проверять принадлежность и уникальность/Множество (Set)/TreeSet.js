import { printAsciiTree } from 'binary-tree-printer';

class Node {
    _height = 0;
    _value = null;

    constructor(value, left, right) {
        this.value = value;
        this.left = left ?? null;
        this.right = right ?? null;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    set height(height) {
        this._height = height;
    }

    get height() {
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
        const newNode = new Node(el);
        newNode.height = (parent?.height ?? 0) + 1;
        return newNode;
    }

    leader() {
        return this.#leader;
    }

    // Пройти по дереву снизу вверх чтобы проверить его сбалансированность
    #rebalance(elIndex) {

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
