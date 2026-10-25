// Фича: Uint8Array.fromBase64 / toBase64 — Base64 без Buffer и btoa
console.log("=== 04. Uint8Array Base64 ===");

// Раньше: Buffer.from(str, "base64") (Node-специфика) или btoa/atob с костылями
// для бинарных данных.

const bytes = Uint8Array.from([72, 105, 33]); // "Hi!"

// Кодирование в Base64
console.log("toBase64:", bytes.toBase64()); // SGkh
console.log("URL-safe:", bytes.toBase64({ alphabet: "base64url" }));

// Декодирование из Base64
const decoded = Uint8Array.fromBase64("SGkh");
console.log("fromBase64:", new TextDecoder().decode(decoded)); // Hi!

// Устойчивость к пробелам при декодировании
console.log("с пробелами:", new TextDecoder().decode(Uint8Array.fromBase64("SG kh")));

// base64url: символы -_ вместо +/
const urlSafe = Uint8Array.fromBase64("SGkh", { alphabet: "base64url" });
console.log("roundtrip:", urlSafe.toBase64());
