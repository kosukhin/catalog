// Фича: optional chaining ?. — безопасный доступ к вложенным свойствам
console.log("=== 01. Optional chaining ===");

const user = { profile: { address: { city: "Москва" } } };

// Раньше: user.profile && user.profile.address && user.profile.address.city
console.log("?. цепочка:", user.profile?.address?.city);
console.log("?. на null:", user.settings?.theme);        // undefined, не ошибка!
console.log("?. на null:", user.settings?.notifications?.email);

// ?. работает и с методами, и с индексами
const api = { fetch: () => "ок" };
console.log("метод:", api.fetch?.());
console.log("метод отсутствует:", api.send?.());
console.log("индекс:", [1, 2, 3]?.[5]);

// Короткое замыкание: если слева null/undefined — всё выражение = undefined
let calls = 0;
const trigger = () => { calls++; return "бум"; };
const obj = null;
console.log("побочный эффект не произошёл:", obj?.prop === undefined && calls === 0);

// Важно: ?. только для null/undefined. Ноль или пустая строка — валидные значения!
console.log("0 не пропуск:", { x: 0 }?.x);
