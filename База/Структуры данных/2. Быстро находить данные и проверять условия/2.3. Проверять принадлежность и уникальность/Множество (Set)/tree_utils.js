export function printArrayAsTree(arr) {
    if (!arr || arr.length === 0) return;

    // 1. Сначала считаем «виртуальные» позиции для каждого индекса массива
    const positions = new Array(arr.length).fill(null);

    // Очередь для расчета координат: [индекс_в_массиве, уровень, координата_X]
    // Начнем с корня (индекс 0) на уровне 0
    let queue = [{ idx: 0, level: 0, x: 0 }];
    let maxLevel = 0;
    let nextArrayIdx = 1; // Указатель для поиска потомков в массиве

    while (queue.length > 0) {
        const { idx, level, x } = queue.shift();
        if (idx >= arr.length) continue;

        positions[idx] = { val: arr[idx], level, x };
        if (level > maxLevel) maxLevel = level;

        if (arr[idx] !== null) {
            // Если узел существует, берем следующие два элемента из массива как его детей
            if (nextArrayIdx < arr.length) {
                queue.push({ idx: nextArrayIdx++, level: level + 1, x: x }); // Временно пишем x, скорректируем ниже
            }
            if (nextArrayIdx < arr.length) {
                queue.push({ idx: nextArrayIdx++, level: level + 1, x: x });
            }
        }
    }

    // 2. Корректируем X-координаты в зависимости от глубины (чтобы дерево красиво разветвлялось)
    for (let i = 0; i < positions.length; i++) {
        if (!positions[i] || positions[i].val === null) continue;

        const level = positions[i].level;
        const offset = Math.pow(2, maxLevel - level) * 2;

        // Ищем детей этого узла в нашей структуре positions
        let childCount = 0;
        for (let j = i + 1; j < positions.length; j++) {
            if (positions[j] && positions[j].level === level + 1 && childCount < 2) {
                if (childCount === 0) {
                    positions[j].x = positions[i].x - offset; // Левый узел сдвигаем влево
                    positions[j].line = '/';
                } else {
                    positions[j].x = positions[i].x + offset; // Правый узел сдвигаем вправо
                    positions[j].line = '\\';
                }
                childCount++;
            }
        }
    }

    // Находим самую левую точку, чтобы сдвинуть всё дерево вправо (избегаем отрицательных координат)
    const minX = Math.min(...positions.filter(p => p && p.val !== null).map(p => p.x));
    positions.forEach(p => { if (p) p.x += Math.abs(minX) + 2; });

    // 3. Собираем строки для вывода в консоль
    const lines = Array.from({ length: (maxLevel + 1) * 2 }, () => []);

    positions.forEach(p => {
        if (!p || p.val === null) return;

        const nodeRow = p.level * 2;
        lines[nodeRow].push({ char: String(p.val), x: p.x });

        // Если это не корень и у него есть символ связи (/ или \)
        if (p.level > 0 && p.line) {
            const lineRow = nodeRow - 1;
            // Рисуем наклонную черту чуть ближе к родителю
            const lineX = p.line === '/' ? p.x + 1 : p.x - 1;
            lines[lineRow].push({ char: p.line, x: lineX });
        }
    });

    // 4. Печатаем результат
    lines.forEach(row => {
        if (row.length === 0) return;
        row.sort((a, b) => a.x - b.x);

        let out = "";
        let cur = 0;
        row.forEach(item => {
            if (item.x > cur) out += " ".repeat(item.x - cur);
            out += item.char;
            cur = item.x + item.char.length;
        });
        console.log(out);
    });
}
