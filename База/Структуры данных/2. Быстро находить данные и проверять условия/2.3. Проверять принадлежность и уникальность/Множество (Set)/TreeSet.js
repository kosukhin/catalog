import { printArrayAsTree } from './tree_utils.js';

/**
 * Берем за основу AVL дерево
 */
class TreeSet {
    // Само дерево
    #tree = [];
    // Высоты узлов для балансировки
    #hights = [];
    #debug = false;

    constructor(debug = false) {
        this.#debug = debug
    }

    add(el) {
        if (this.#debug) {
            console.log('Add: ', el);
        }
        // Добавляем всегда в конец
        this.#tree.push(el);
        this.#hights.push(0);
        this.#binaryTreeInvariant(this.#tree.length - 1);
        this.#rebalance(this.#tree.length - 1);
    }

    // По значению найти индекс
    findIndex(el) {
        return 1;
    }

    // Перестроить дерево для поддержания инварианта бинарного дерева
    #binaryTreeInvariant(elIndex) {
        const elValue = this.#tree[elIndex];
        const parentIndex = this.parentIndex(elIndex);
        const parent = this.#tree[parentIndex];
        const parentLeft = this.#tree[this.leftChildIndex(parent)];
        const parentRight = this.#tree[this.rightChildIndex(parent)];
        const iamLeft = elValue === parentLeft;
        const iamRight = elValue === parentRight;
        const iamRoot = parent === null || parent === undefined;
        if (iamRoot) {
            return;
        }
        if ((iamLeft && elValue > parent) || (iamRight && elValue < parent)) {
            this.#tree[elIndex] = parent;
            this.#tree[parentIndex] = elValue;
        }
    }

    tree() {
        return this.#tree;
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
tree.add(4);
tree.add(21);
tree.add(7);
tree.add(19);

console.log(tree.tree());
printArrayAsTree(tree.tree());
