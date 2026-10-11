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

console.log("Читаем что ввел пользователь в консоль")
tick();
