/**
 * Берем за основу AVL дерево
 */
class TreeSet {
    #tree = [];

    add(el) {
        this.#tree.push(el);
        this.#binaryTreeInvariant(this.#tree.length - 1);
        this.#rebalance(this.#tree.length - 1);
    }

    // По значению найти индекс
    findIndex(el) {

    }

    // Перестроить дерево для поддержания инварианта бинарного дерева
    #binaryTreeInvariant(elIndex) {

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

const readline = require('node:readline');

function tick() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Как вас зовут? ', (answer) => {
        console.log(`Привет, ${answer}!`);
        rl.close();
        if (answer !== 'x') {
            tick();
        }
    });
}

tick();
