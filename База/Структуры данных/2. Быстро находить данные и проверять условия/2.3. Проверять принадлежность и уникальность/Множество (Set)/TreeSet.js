class TreeSet {
    #tree = [];

    add(el) {

    }

    delete(el) {

    }

    contains(el) {

    }

    leftChild(elIndex) {

    }

    rightChild(elIndex) {

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
