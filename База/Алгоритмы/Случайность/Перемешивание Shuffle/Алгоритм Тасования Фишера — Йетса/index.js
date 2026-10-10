function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Меняем элементы местами (деструктуризация)
  }
  return array;

}

const baseArray = ['Z', 'Z', 'Z', 'X', 'X', 'X', 'X', 'Y', 'Y', 'Y'];
const shuffled = shuffle(baseArray);
console.log(shuffled); 