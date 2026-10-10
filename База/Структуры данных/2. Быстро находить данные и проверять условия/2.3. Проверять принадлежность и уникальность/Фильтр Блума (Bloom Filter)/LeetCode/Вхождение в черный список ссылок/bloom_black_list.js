
const bad_urls = [];
for(let i = 0; i < 1_000; i++) {
    bad_urls.push('http://bad-url-' + i + '.com');
}

const correct_urls = [];
for(let i = 0; i < 10_000; i++) {
    correct_urls.push('http://correct-url-' + i + '.com');
} 

const random_urls = shuffle([].concat(correct_urls, bad_urls));

/**
 * Фильтр блума, его задача сохранить
 * множество элементов в компактном виде
 * чтобы была возмжность проверить что
 * какой-то другой элемент точно не входит в 
 * множество уже добавленных в фильтр элементов
 */
class BloomFilter {
    #bitset; // Карта битов
    #size; // Размер фильтра

    constructor(size) {
        this.#size = size;
        this.#bitset = new Array(size);
    }

    // Проверить содержит ли фильтр значение по хэшам
    contains(hashesFn) {
        const hashes = hashesFn();
        return hashes.reduce((result, hash) => {
            const bitIndex = this.bitIndex(hash);
            result = result && Boolean(this.#bitset[bitIndex]);
            return result;
        }, true);
    }

    // Добавить в фильтр значение по хэшам
    add(hashesFn) {
        const hashes = hashesFn();
        hashes.forEach(hash => {
            const bitIndex = this.bitIndex(hash);
            this.#bitset[bitIndex] = 1;
        });
    }

    bitIndex(hash) {
        return hash % this.#size;
    }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Меняем элементы местами (деструктуризация)
  }
  return array;
}

function urlHashes(url) {
    return [
        murmurHash3(url),
        djb2(url),
        fnv1a(url)
    ];
}

function murmurHash3(str, seed = 0) {
  const data = new TextEncoder().encode(str);
  const len = data.length;
  let h = seed;
  let i = 0;

  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  while (i + 4 <= len) {
    let k =
      data[i] |
      (data[i + 1] << 8) |
      (data[i + 2] << 16) |
      (data[i + 3] << 24);

    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);

    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;

    i += 4;
  }

  let k = 0;
  const remaining = len - i;

  if (remaining >= 3) k ^= data[i + 2] << 16;
  if (remaining >= 2) k ^= data[i + 1] << 8;
  if (remaining >= 1) {
    k ^= data[i];
    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);
    h ^= k;
  }

  h ^= len;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h >>> 0;
}

function fnv1a(str) {
  let hash = 0x811c9dc5;
  const data = new TextEncoder().encode(str);

  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function djb2(str) {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  return hash >>> 0;
}

const filterInstance = new BloomFilter(1000);

bad_urls.forEach(url => {
    filterInstance.add(urlHashes.bind(null, url));
});

let bad_urls_count = 0;

random_urls.forEach(url => {
    if (filterInstance.contains(urlHashes.bind(null, url))) {
        bad_urls_count += 1;
    }
});

console.log('Total urls = ', random_urls.length, ' bad urls = ', bad_urls_count);
