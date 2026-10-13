const test = {};

try {
    console.log(test?.person.name);
} catch {
    console.log('Так нельзя операторы доступа по "." применяются последовательно');
}


console.log(test?.person?.name, 'Так можно');
