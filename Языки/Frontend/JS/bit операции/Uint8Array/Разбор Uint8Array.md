# Uint8Array

Хранит массив байтов, с которым можно работать и на уровне битов

## Управление конкретным битом в массиве байтов

```javascript
const bits = new Uint8Array(1250);

// Установить бит по индексу
function setBit(i, value) {
  const byte = i >> 3;
  const mask = 1 << (i & 7);

  if (value) bits[byte] |= mask;
  else bits[byte] &= ~mask;
}

// Прочитать бит по индексу
function getBit(i) {
  return (bits[i >> 3] >> (i & 7)) & 1;
}

setBit(9999, 1);
console.log(getBit(9999)); // 1++
```