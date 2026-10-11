import { printArrayAsTree } from './tree_utils.js';

/**
 * Берем за основу AVL дерево
 */
class BinaryHeap {
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
        const parentLeft = this.#tree[this.leftChildIndex(parentIndex)];
        const parentRight = this.#tree[this.rightChildIndex(parentIndex)];
        const iamLeft = elValue === parentLeft;
        const iamRight = elValue === parentRight;
        const iamRoot = parent === null || parent === undefined;
        if (iamRoot) {
            return;
        }
        if ((iamLeft && elValue > parent) || (iamRight && elValue < parent)) {
            this.#tree[elIndex] = parent;
            this.#tree[parentIndex] = elValue;
            this.#binaryTreeInvariant(parentIndex);
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

const heap = new BinaryHeap(true);
heap.add(1);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(4);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(21);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(7);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(19);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(22);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(25);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(10);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(26);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(27);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(28);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(11);
console.log(heap.tree());
printArrayAsTree(heap.tree());

heap.add(12);
console.log(heap.tree());
printArrayAsTree(heap.tree());
