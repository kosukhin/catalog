// Фича: String.prototype.replaceAll — замена всех вхождений
console.log("=== 01. replaceAll ===");

// replace с строковым аргументом менял только ПЕРВОЕ вхождение
console.log("replace:", "a-a-a".replace("-", "+"));       // a+a-a
console.log("replaceAll:", "a-a-a".replaceAll("-", "+")); // a+a+a

// Для полной замены раньше нужен был regex с флагом g
console.log("старый способ:", "a-a-a".replace(/-/g, "+"));

// Работает с regex (обязателен флаг g)
console.log("regex:", "a-a-a".replaceAll(/-/g, "+"));
try { "a".replaceAll(/-/, "+"); } catch (e) { console.log("без /g:", e.message); }
