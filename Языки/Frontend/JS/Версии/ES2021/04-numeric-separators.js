// Фича: числовые разделители _ — читаемые большие числа
console.log("=== 04. Числовые разделители ===");

const budget = 1_000_000_000;         // миллиард
const msPerDay = 86_400_000;          // миллисекунд в сутках
const bytes = 0b1010_0001_1000_0101;  // бинарник с разделителями
const hex = 0xFF_FF_FF;               // hex
const float = 1_000.000_001;

console.log("миллиард:", budget);
console.log("мс в сутках:", msPerDay);
console.log("бинарник:", bytes);
console.log("hex:", hex);
console.log("float:", float);
console.log("разделители не влияют на значение:", 1_000 === 1000);
