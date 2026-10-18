export function djb2(str) {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  return hash >>> 0;
}

console.log(djb2('AAABBB'));
