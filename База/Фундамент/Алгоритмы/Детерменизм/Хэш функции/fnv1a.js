export function fnv1a(str) {
  let hash = 0x811c9dc5;
  const data = new TextEncoder().encode(str);

  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}
