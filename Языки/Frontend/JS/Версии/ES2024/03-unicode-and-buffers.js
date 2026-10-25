// Фичи: isWellFormed/toWellFormed, resizable ArrayBuffer, regex /v
console.log("=== 03. Unicode и буферы ===");

// 1. Суррогатные пары: некорректная строка ломает encodeURI
const broken = "\uD800"; // одиночный суррогат
console.log("isWellFormed сломанной:", broken.isWellFormed());   // false
console.log("toWellFormed чинит:", broken.toWellFormed());       // �
console.log("после чинки:", broken.toWellFormed().isWellFormed()); // true
console.log("нормальная строка:", "привет".isWellFormed());       // true

// 2. Resizable ArrayBuffer — изменение размера без копирования
const rb = new ArrayBuffer(8, { maxByteLength: 32 });
rb.resize(16);
console.log("resizable после resize(16):", rb.byteLength);

// 3. Regex /v: наборы символов с квантификаторами и \p-классами
console.log("v-flag:", /\p{RGI_Emoji}/v.test("👍"));
