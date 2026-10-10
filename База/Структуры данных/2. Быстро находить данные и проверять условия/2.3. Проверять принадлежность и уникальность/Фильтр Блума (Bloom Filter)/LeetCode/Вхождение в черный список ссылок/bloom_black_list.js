function url_generator() {
    
    return [1, 2, 3]
}

console.log(JSON.stringify(url_generator(), null, 2));

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Меняем элементы местами (деструктуризация)
  }
  return array;
}