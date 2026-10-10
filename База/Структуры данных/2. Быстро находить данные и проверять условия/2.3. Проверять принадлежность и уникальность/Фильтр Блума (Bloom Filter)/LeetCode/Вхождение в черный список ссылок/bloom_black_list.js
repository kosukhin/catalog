function url_generator() {
    const correct_urls = [1];
    const bad_urls = [2];
    
    return shuffle([].concat(correct_urls, bad_urls));
}

console.log(JSON.stringify(url_generator(), null, 2));

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Меняем элементы местами (деструктуризация)
  }
  return array;
}