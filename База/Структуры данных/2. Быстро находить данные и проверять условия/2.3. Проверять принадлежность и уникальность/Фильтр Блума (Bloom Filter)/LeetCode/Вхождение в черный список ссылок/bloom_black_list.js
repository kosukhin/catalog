
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
    #bitset; // Карта битов
    #size; // Размер фильтра

    constructor(size) {
        this.#bitset = new Array(size);
    }

    // Проверить содержит ли фильтр значение по хэшам
    contains(hashesFn) {
        const hashes = hashesFn();
        return hashes.reduce((result, hash) => {
            const bitIndex = hash % this.#size;
            result = result && Boolean(this.#bitset[bitIndex]);
            return result;
        }, false)
    }

    // Добавить в фильтр значение по хэшам
    add(hashesFn) {

    }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Меняем элементы местами (деструктуризация)
  }
  return array;
}