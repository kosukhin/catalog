export function printArrayAsTree(arr) {
    if (!arr?.length || arr[0] == null) return;

    const nodes = [];

    function build(idx, depth = 0) {
        if (idx >= arr.length || arr[idx] == null) return null;

        const node = {
            value: String(arr[idx]),
            depth,
            left: build(2 * idx + 1, depth + 1),
            right: build(2 * idx + 2, depth + 1),
            x: 0
        };

        nodes.push(node);
        return node;
    }

    const root = build(0);
    const gap = 2;

    // Вычисляем ширину каждого поддерева
    function measure(node) {
        if (!node) return 0;

        node.width = Math.max(
            node.value.length,
            measure(node.left) + measure(node.right) + gap
        );

        return node.width;
    }

    measure(root);

    // Расставляем узлы внутри выделенного пространства
    function layout(node, left, right) {
        if (!node) return;

        node.x = Math.floor((left + right) / 2);

        if (node.left && node.right) {
            const mid = Math.floor((left + right) / 2);
            layout(node.left, left, mid - gap);
            layout(node.right, mid + gap, right);
        } else if (node.left) {
            layout(node.left, left, right - gap);
        } else if (node.right) {
            layout(node.right, left + gap, right);
        }
    }

    layout(root, 0, root.width * 2);

    const minX = Math.min(...nodes.map(n => n.x));
    for (const node of nodes) node.x -= minX;

    const height = Math.max(...nodes.map(n => n.depth)) * 2 + 1;
    const grid = Array.from({ length: height }, () => []);

    function put(row, col, text) {
        for (let i = 0; i < text.length; i++) {
            const x = col + i;
            while (grid[row].length <= x) grid[row].push(" ");
            grid[row][x] = text[i];
        }
    }

    function draw(node) {
        if (!node) return;

        const row = node.depth * 2;
        const start = node.x - Math.floor(node.value.length / 2);

        put(row, start, node.value);

        if (node.left) {
            put(row + 1, Math.floor((node.x + node.left.x) / 2), "/");
            draw(node.left);
        }

        if (node.right) {
            put(row + 1, Math.floor((node.x + node.right.x) / 2), "\\");
            draw(node.right);
        }
    }

    draw(root);

    for (const line of grid) {
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
