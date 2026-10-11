import { printAsciiTree } from 'binary-tree-printer';

class Node {
    _height = 0;

    constructor(value, left, right) {
        this.value = value;
        this.left = left ?? null;
        this.right = right ?? null;
    }

    setHeight(height) {
        this._height = height;
    }

    height() {
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
            this.#leader = new Node(el);
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
                parent.left = new Node(el);
            }
        } else if (parent.value < el) {
            if (parent.right) {
                this.add(el, parent.right);
            } else {
                parent.right = new Node(el);
            }
        }
    }

    tree() {
        return treeToArray(this.#leader);
    }

    leader() {
        return this.#leader;
    }

    // По значению найти индекс
    findIndex(el) {
        return 1;
    }

    // Пройти по дереву снизу вверх чтобы проверить его сбалансированность
    #rebalance(elIndex) {

    }

    delete(el) {

    }

    contains(el) {

    }

    leftChildIndex(elIndex) {
        return 2*elIndex + 1;
    }

    rightChildIndex(elIndex) {
        return 2*elIndex + 2;
    }

    parentIndex(elIndex) {
        return (elIndex - 1) / 2;
    }
}

console.log('Tree Set')

const tree = new TreeSet(true);

tree.add(1);
printAsciiTree(tree.leader());

tree.add(4);
printAsciiTree(tree.leader());

tree.add(21);
printAsciiTree(tree.leader());

tree.add(7);
printAsciiTree(tree.leader());

tree.add(19);
printAsciiTree(tree.leader());

tree.add(22);
printAsciiTree(tree.leader());

tree.add(25);
printAsciiTree(tree.leader());

tree.add(10);
printAsciiTree(tree.leader());

tree.add(26);
printAsciiTree(tree.leader());

tree.add(27);
printAsciiTree(tree.leader());

tree.add(28);
printAsciiTree(tree.leader());

tree.add(11);
printAsciiTree(tree.leader());

tree.add(12);
console.log(printAsciiTree(tree.leader()));
