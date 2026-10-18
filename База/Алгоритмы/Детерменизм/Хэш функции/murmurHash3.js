export function murmurHash3(str, seed = 0) {
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

console.log(murmurHash3('AAABBB'));
