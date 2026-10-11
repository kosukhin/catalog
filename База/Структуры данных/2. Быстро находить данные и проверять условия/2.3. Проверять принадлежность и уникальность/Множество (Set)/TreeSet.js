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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

while (true) {
    rl.question('Как вас зовут? ', (answer) => {
        console.log(`Привет, ${answer}!`);
        rl.close();
    });
}
