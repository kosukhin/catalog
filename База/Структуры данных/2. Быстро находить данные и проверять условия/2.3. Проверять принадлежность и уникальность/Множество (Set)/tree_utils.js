export function printArrayAsTree(arr) {
    if (!arr || arr.length === 0) return;

    const maxLevel = Math.floor(Math.log2(arr.length));
    const totalLines = (maxLevel + 1) * 2 - 1;

    // Создаем массив строк фиксированной ширины для сетки
    // Ширина зависит от глубины дерева
    const width = Math.pow(2, maxLevel + 1) * 3;
    const grid = Array.from({ length: totalLines }, () => Array(width).fill(" "));

    // Функция для рекурсивной отрисовки
    // idx - индекс в массиве, level - текущий уровень, (left, right) - границы для центрирования
    function fillGrid(idx, level, left, right) {
        if (idx >= arr.length || arr[idx] === null || arr[idx] === undefined) return;

        // Находим середину выделенного под узел пространства
        const mid = Math.floor((left + right) / 2);
        const nodeRow = level * 2;
        const valStr = String(arr[idx]);

        // Записываем значение узла в сетку
        for (let i = 0; i < valStr.length; i++) {
            if (mid + i < width) {
                grid[nodeRow][mid + i] = valStr[i];
            }
        }

        // Рисуем левого потомка (2 * idx + 1)
        const leftIdx = 2 * idx + 1;
        if (leftIdx < arr.length && arr[leftIdx] !== null && arr[leftIdx] !== undefined) {
            const childMid = Math.floor((left + mid) / 2);
            // Черточка строго посередине между родителем и левым ребенком
            const lineX = Math.floor((mid + childMid) / 2) + 1;
            grid[nodeRow + 1][lineX] = "/";
            fillGrid(leftIdx, level + 1, left, mid);
        }

        // Рисуем правого потомка (2 * idx + 2)
        const rightIdx = 2 * idx + 2;
        if (rightIdx < arr.length && arr[rightIdx] !== null && arr[rightIdx] !== undefined) {
            const childMid = Math.floor((mid + right) / 2);
            // Черточка строго посередине между родителем и правым ребенком
            const lineX = Math.floor((mid + childMid) / 2);
            grid[nodeRow + 1][lineX] = "\\";
            fillGrid(rightIdx, level + 1, mid, right);
        }
    }

    // Запускаем заполнение сетки от корня (индекс 0)
    fillGrid(0, 0, 0, width);

    // Выводим сетку в консоль, склеивая массивы символов в строки
    grid.forEach(row => {
        const lineStr = row.join("");
        // Печатаем строку, только если она не пустая (чтобы убрать лишние пробелы в конце)
        if (lineStr.trim().length > 0) {
            console.log(lineStr.trimEnd());
        }
    });
}

export function treeToArray(leader) {
    const queue = [leader];
    const result = [];
    while (queue.length) {
        const node = queue.shift();
        result.push(node?.value ?? null);
        if (node === null) {
            continue;
        }
        queue.push(node?.left ?? null);
        queue.push(node?.right ?? null);
    }
    return result;
}
