// Фичи: WeakMap с Symbol-ключами, hashbang-грамматика
console.log("=== 03. Прочее из ES2023 ===");

// 1. WeakMap теперь принимает Symbol в качестве ключей (раньше — только объекты)
const cache = new WeakMap();
const k1 = Symbol("private-key");
cache.set(k1, "значение по символу");
console.log("WeakMap + Symbol:", cache.get(k1));

// 2. Hashbang: строка #!/usr/bin/env node допустима в JS-файлах —
//    здесь демонстрируем её «факт» (реальный пример — в шебанге скриптов CLI)
console.log("hashbang валиден в .js файлах Node: да (см. CLI-скрипты)");
