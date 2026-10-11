/**
 * Берем за основу AVL дерево
 */
class TreeSet {
    // Само дерево
    #tree = [];
    // Высоты узлов для балансировки
    #hights = [];

    add(el) {
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
        const parent = this.parent(elIndex);
    }

    // Пройти по дереву снизу вверх чтобы проверить его сбалансированность
    #rebalance(elIndex) {

    }

    delete(el) {

    }

    contains(el) {

    }

    leftChild(elIndex) {
        return this.#tree[2*elIndex + 1] ?? null;
    }

    rightChild(elIndex) {
        return this.#tree[2*elIndex + 2] ?? null;
    }

    parent(elIndex) {
        return (elIndex - 1) / 2 ?? null;
    }
}

console.log('Tree Set')

const tree = new TreeSet();
tree.add(1);
tree.add(4);
tree.add(21);
tree.add(7);
tree.add(19);
