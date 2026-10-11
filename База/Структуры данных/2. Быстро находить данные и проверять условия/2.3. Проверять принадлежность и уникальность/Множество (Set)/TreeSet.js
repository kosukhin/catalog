import { printArrayAsTree, treeToArray } from 'binary-tree-printer';

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
printArrayAsTree(tree.tree());

tree.add(4);
printArrayAsTree(tree.tree());

tree.add(21);
printArrayAsTree(tree.tree());

tree.add(7);
printArrayAsTree(tree.tree());

tree.add(19);
printArrayAsTree(tree.tree());

tree.add(22);
printArrayAsTree(tree.tree());

tree.add(25);
printArrayAsTree(tree.tree());

tree.add(10);
printArrayAsTree(tree.tree());

tree.add(26);
printArrayAsTree(tree.tree());

tree.add(27);
printArrayAsTree(tree.tree());

tree.add(28);
printArrayAsTree(tree.tree());

tree.add(11);
printArrayAsTree(tree.tree());

tree.add(12);
printArrayAsTree(tree.tree());
