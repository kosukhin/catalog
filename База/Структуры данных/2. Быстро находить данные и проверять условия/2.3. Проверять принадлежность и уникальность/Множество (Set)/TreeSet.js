/**
 * Берем за основу AVL дерево
 */
class TreeSet {
    #tree = [];

    add(el) {
        this.#tree.push(el);
    }

    #rebalance() {

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
