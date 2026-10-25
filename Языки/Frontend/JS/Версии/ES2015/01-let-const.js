// Фича: let и const — блочная область видимости вместо var
console.log("=== 01. let и const ===");

let mutable = 10;
const FIXED = 20;
{
  let scoped = 1; // видна только внутри блока
  console.log("блок let:", scoped + mutable + FIXED); // 31
}

try { eval("scoped"); } catch (e) {
  console.log("вне блока scoped не существует:", e.name); // ReferenceError
}

const ARR = [1, 2];
ARR.push(3);           // содержимое const-объекта менять можно
try { ARR = []; } catch (e) { console.log("переприсвоить const нельзя:", e.name); } // TypeError
console.log("const защищает от переприсваивания, но не от мутации:", ARR);
