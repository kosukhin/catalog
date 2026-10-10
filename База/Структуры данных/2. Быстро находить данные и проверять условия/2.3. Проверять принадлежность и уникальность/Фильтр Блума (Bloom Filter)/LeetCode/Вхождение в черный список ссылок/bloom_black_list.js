
const bad_urls = [];
for(let i = 0; i < 1_000; i++) {
    bad_urls.push('http://bad-url-' + i + '.com');
}

const correct_urls = [];
for(let i = 0; i < 10_000; i++) {
    correct_urls.push('http://correct-url-' + i + '.com');
} 

const random_urls = shuffle([].concat(correct_urls, bad_urls));

console.log(JSON.stringify(random_urls, null, 2));

class BloomFilter {
    #bitset;

    constructor(size) {
        this.#bitset = new Array(size);
    }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Меняем элементы местами (деструктуризация)
  }
  return array;
}