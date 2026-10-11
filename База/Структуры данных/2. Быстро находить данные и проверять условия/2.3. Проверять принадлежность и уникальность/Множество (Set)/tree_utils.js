export function printArrayAsTree(arr) {
    if (!arr || arr.length === 0) return;

    // 1. Считаем максимальную глубину дерева на основе длины массива
    const maxLevel = Math.floor(Math.log2(arr.length));

    // Структура для хранения координат: [{ val, level, x, line }]
    const positions = new Array(arr.length).fill(null);

    // Очередь для BFS: [индекс, уровень, координата_X]
    // Начинаем с корня (индекс 0) в центре (координата X зависит от глубины)
    const initialX = Math.pow(2, maxLevel) * 3;
    let queue = [{ idx: 0, level: 0, x: initialX }];

    while (queue.length > 0) {
        const { idx, level, x } = queue.shift();
        if (idx >= arr.length || arr[idx] === null) continue;

        positions[idx] = { val: arr[idx], level, x };

        // Смещение для потомков текущего уровня
        const offset = Math.pow(2, maxLevel - level) * 1.5;

        // Левый потомок строго по формуле: 2 * i + 1
        const leftIdx = 2 * idx + 1;
        if (leftIdx < arr.length && arr[leftIdx] !== null) {
            const nextX = x - Math.max(2, Math.floor(offset));
            positions[leftIdx] = { val: arr[leftIdx], level: level + 1, x: nextX, line: '/' };
            queue.push({ idx: leftIdx, level: level + 1, x: nextX });
        }

        // Правый потомок строго по формуле: 2 * i + 2
        const rightIdx = 2 * idx + 2;
        if (rightIdx < arr.length && arr[rightIdx] !== null) {
            const nextX = x + Math.max(2, Math.floor(offset));
            positions[rightIdx] = { val: arr[rightIdx], level: level + 1, x: nextX, line: '\\' };
            queue.push({ idx: rightIdx, level: level + 1, x: nextX });
        }
    }

    // 2. Строим строки для вывода в консоль
    const lines = Array.from({ length: (maxLevel + 1) * 2 }, () => []);

    positions.forEach((p, idx) => {
        if (!p || p.val === null) return;

        const nodeRow = p.level * 2;
        lines[nodeRow].push({ char: String(p.val), x: p.x });

        // Если это потомок, рисуем соединительную линию над ним
        if (p.level > 0 && p.line) {
            const lineRow = nodeRow - 1;
            // Корректируем положение палочки для красоты
            const lineX = p.line === '/' ? p.x + String(p.val).length : p.x - 1;
            lines[lineRow].push({ char: p.line, x: lineX });
        }
    });

    // 3. Выводим результат в консоль
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
