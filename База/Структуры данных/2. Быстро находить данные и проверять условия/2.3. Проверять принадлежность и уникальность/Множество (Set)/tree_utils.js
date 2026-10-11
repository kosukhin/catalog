export function printArrayAsTree(arr) {
    if (!arr || arr.length === 0 || arr[0] == null) return;

    const nodes = [];

    // Собираем существующие узлы и их связи
    function collect(idx, depth) {
        if (idx >= arr.length || arr[idx] == null) return;

        const node = {
            idx,
            depth,
            value: String(arr[idx]),
            left: null,
            right: null,
            x: 0
        };

        nodes.push(node);

        node.left = collect(idx * 2 + 1, depth + 1);
        node.right = collect(idx * 2 + 2, depth + 1);

        return node;
    }

    const root = collect(0, 0);
    const levels = [];

    // Группируем узлы по уровням
    for (const node of nodes) {
        if (!levels[node.depth]) levels[node.depth] = [];
        levels[node.depth].push(node);
    }

    // Располагаем узлы каждого уровня с минимальным шагом
    const gap = 3;

    for (const level of levels) {
        let x = 0;

        for (const node of level) {
            node.x = x;
            x += node.value.length + gap;
        }
    }

    // Корректируем позиции снизу вверх:
    // родитель располагается между своими детьми
    function position(node) {
        if (!node) return;

        position(node.left);
        position(node.right);

        if (node.left && node.right) {
            node.x = Math.floor(
                (node.left.x + node.right.x) / 2
            );
        } else if (node.left) {
            node.x = node.left.x + 2;
        } else if (node.right) {
            node.x = node.right.x - 2;
        }
    }

    position(root);

    // Для более компактного вывода используем координаты узлов
    const minX = Math.min(...nodes.map(n => n.x));
    for (const node of nodes) node.x -= minX;

    const maxDepth = Math.max(...nodes.map(n => n.depth));
    const lines = Array.from(
        { length: maxDepth * 2 + 1 },
        () => []
    );

    function put(row, col, text) {
        while (lines[row].length < col) lines[row].push(" ");
        for (const ch of text) lines[row].push(ch);
    }

    // Рисуем связи, затем значения узлов
    for (const node of nodes) {
        const row = node.depth * 2;
        put(row, node.x, node.value);

        if (node.left) {
            put(row + 1, Math.max(0, node.left.x + 1), "/");
        }

        if (node.right) {
            put(row + 1, node.x + node.value.length + 1, "\\");
        }
    }

    for (const line of lines) {
        const text = line.join("").trimEnd();
        if (text.trim()) console.log(text);
    }
}

export function treeToArray(root) {
    if (!root) return [];

    const result = [];
    const queue = [{ node: root, index: 0 }];

    let head = 0;

    while (head < queue.length) {
        const { node, index } = queue[head++];

        result[index] = node.value;

        if (node.left) {
            queue.push({
                node: node.left,
                index: 2 * index + 1
            });
        }

        if (node.right) {
            queue.push({
                node: node.right,
                index: 2 * index + 2
            });
        }
    }

    return result.map(value => value ?? null);
}
