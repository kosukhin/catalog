class Node {
    _height = 0;
    _parent = null;
    _value = null;

    constructor(value, left, right, parent) {
        this._value = value;
        this.left = left ?? null;
        this.right = right ?? null;
        this._parent = parent;
    }

    get parent() {
        return this._parent;
    }

    set parent(parent) {
        this._parent = parent;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    set subtreeHeight(height) {
        this._height = height;
    }

    get subtreeHeight() {
        return this._height;
    }
}

/**
 * Берем за основу AVL дерево
 */
export class TreeSet {
    // Само дерево
    #leader = null;
    #debug = false;

    constructor(debug = false) {
        this.#debug = debug
    }

    add(el) {
        if (this.#debug) {
            console.log('-------------------');
            console.log('Add: ', el);
        }
        this.#placeBST(el, this.#leader);
    }

    // Основной метод ради которого и создается множество
    // Чтобы добавить в него элемент и проверить существование
    contains(el) {
        return !!this.find(el);
    }

    // Убрать элемент из множества по значению
    delete(el) {
        if (this.#debug) {
            console.log('-------------------');
            console.log('Delete: ', el);
        }
        const node = this.find(el);
        if (!node) {
            return;
        }
        if (!node.left && !node.right) {
            if (!node.parent) {
                this.#leader = null;
            } else {
                const slot = this.#parentSlot(node);
                node.parent[slot] = null;
                this.#rebalance(node.parent);
            }
        }
        if (!node.left && node.right || node.left && !node.right) {
            const successor = node.right ?? node.left;
            if (this.#debug) {
                console.log('Successor:', successor.value);
            }
            if (!node.parent) {
                this.#leader = successor;
                successor.parent = null;
            } else {
                const slot = this.#parentSlot(node);
                node.parent[slot] = successor;
                successor.parent = node.parent;
            }
            this.#updateNodeHeight(successor);
            this.#rebalance(successor);
        }
        if (node.left && node.right) {
            const leftMostRight = this.findLeftMostChild(node.right);
            const rightMostLeft = this.findRightMostChild(node.left);
            const successor = leftMostRight.subtreeHeight < rightMostLeft.subtreeHeight ? leftMostRight : rightMostLeft;
            if (this.#debug) {
                console.log('Successor:', successor.value);
            }
            const successorSlot = this.#parentSlot(successor);
            const successorReverseSlot = successorSlot && (successorSlot === 'left' ? 'right' : 'left');
            const nodeSlot = this.#parentSlot(node);
            const successorReverseSlotNode = successor[successorReverseSlot];
            // Существующее поддерево с обратной стороны у приемника переходит к родителю приемника
            if (successorReverseSlotNode) {
                successorReverseSlotNode.parent = successor.parent;
                successor.parent[successorSlot] = successorReverseSlotNode;
            }
            if (successor.parent) {
                successor.parent[successorSlot] = null;
            }
            // К родителю удаляемого узла привязываем преемника
            if (nodeSlot) {
                node.parent[nodeSlot] = successor;
                successor.parent = node.parent;
            } else {
                this.#leader = successor;
                successor.parent = null;
            }
            successor.left = node.left !== null && successor.left !== node.left ? node.left : successor.left;
            successor.right = node.right !== null && successor.right !== node.right ? node.right : successor.right;
            if (successor.left?.parent) {
                successor.left.parent = successor;
            }
            if (successor.right?.parent) {
                successor.right.parent = successor;
            }
            this.#updateNodeHeight(successor);
            this.#rebalance(successor);
        }
    }

    // Логарифмически ищет узел по значению
    // Если находит то возвращает его, если не находит
    // То возвращает null
    find(el, candidate) {
        if (!candidate) {
            candidate = this.#leader;
        }
        if (candidate.value === el) {
            return candidate;
        }
        if (el < candidate.value && candidate.left) {
            return this.find(el, candidate.left);
        }
        if (el > candidate.value && candidate.right) {
            return this.find(el, candidate.right);
        }
        return null;
    }

    // Обход дерева в ширину BFS
    // Передает в cb массив найденных узлов на слое
    // Если cb вернет false поиск прекратить
    traverse(cb) {
        const queue = [this.#leader];
        let interruptedByCb = false;
        while(queue.length && !interruptedByCb) {
            const cbResult = cb(queue);
            if (cbResult === false) {
                interruptedByCb = true;
            }
            const node = queue.shift();
            if (node.left) {
                queue.push(node.left);
            }
            if (node.right) {
                queue.push(node.right);
            }
        }
    }

    // Корень дерева
    leader() {
        return this.#leader;
    }

    findLeftMostChild(node) {
        const queue = [node];
        while(queue.length) {
            const currentNode = queue.shift();
            if (currentNode.left) {
                queue.push(currentNode.left);
            } else {
                return currentNode;
            }
        }
        return node;
    }

    findRightMostChild(node) {
        const queue = [node];
        while(queue.length) {
            const currentNode = queue.shift();
            if (currentNode.right) {
                queue.push(currentNode.right);
            } else {
                return currentNode;
            }
        }
        return node;
    }

    // Поместить элемент в корректную позицию по BST инварианту
    #placeBST(el, candidate) {
        if (this.#leader === null) {
            this.#leader = this.#createNewNode(el);
            return;
        }
        if (!candidate) {
            candidate = this.#leader;
        }
        if (candidate.value === el) {
            return;
        }
        if (candidate.value > el) {
            if (candidate.left) {
                this.#placeBST(el, candidate.left);
            } else {
                this.#createNewNode(el, candidate, 'left');
            }
        } else if (candidate.value < el) {
            if (candidate.right) {
                this.#placeBST(el, candidate.right);
            } else {
                this.#createNewNode(el, candidate, 'right');
            }
        }
    }

    // Создание нового узла в дереве
    #createNewNode(el, parent, slot) {
        const newNode = new Node(el, null, null, parent);
        newNode.subtreeHeight = 0;
        if (parent && slot) {
            parent[slot] = newNode;
            this.#bubbling(newNode, this.#updateNodeHeight);
            this.#rebalance(newNode);
            this.#bubbling(newNode, this.#updateNodeHeight);
        }
        return newNode;
    }

    // Перебалансировка от узла к родителю
    #rebalance(node) {
        const rightHeight = node?.right?.subtreeHeight ?? 0;
        const leftHeight = node?.left?.subtreeHeight ?? 0;
        const diff = leftHeight - rightHeight;
        if (diff >= 2) {
            // Балансируем левую сторону
            const childLeft = node.left;
            // LR
            if (childLeft.right && !childLeft.left) {
                this.#rotateLeft(childLeft);
                this.#rotateRight(node);
                // RR
            } else {
                this.#rotateRight(node);
            }
        }
        if (diff <= -2) {
            // Балансируем правую сторону
            const childRight = node.right;
            // RL
            if (childRight.left && !childRight.right) {
                this.#rotateRight(childRight);
                this.#rotateLeft(node);
                // LL
            } else {
                this.#rotateLeft(node);
            }
        }
        if (node.parent) {
            this.#rebalance(node.parent);
        }
    }

    // Всплытие к родителю
    #bubbling(fromNode, cb) {
        cb(fromNode);
        if (fromNode.parent) {
            this.#bubbling(fromNode.parent, cb);
        }
    }

    // Пересчет высоты поддерева узла
    #updateNodeHeight(node) {
        const rightHeight = node?.right?.subtreeHeight ?? 0;
        const leftHeight = node?.left?.subtreeHeight ?? 0;
        node.subtreeHeight = Math.max(rightHeight, leftHeight) + 1;
    }

    // Определение в каком слоте родителя находится узел
    #parentSlot(node) {
        const parent = node.parent;
        if (!parent) {
            return null;
        }
        return parent.left === node ? 'left' : parent.right === node ? 'right' : null;
    }

    // Поворот поддерева влево от узла
    #rotateLeft(node) {
        const rightChild = node.right;
        if (!rightChild) {
            throw new Error(`У узла ${node.value} нет правого потомка`)
        }
        const parent = node.parent;
        if (parent) {
            const parentSlot = this.#parentSlot(node);
            parent[parentSlot] = rightChild;
        } else {
            this.#leader = rightChild;
            this.#leader.parent = null;
        }
        rightChild.parent = parent;
        const rightChildLeft = rightChild.left;
        rightChild.left = node;
        node.parent = rightChild;
        node.right = null;
        if (rightChildLeft) {
            node.right = rightChildLeft;
            rightChildLeft.parent = node;
        }
        this.#updateNodeHeight(node);
        this.#updateNodeHeight(rightChild);
        if (parent) {
            this.#updateNodeHeight(parent);
        }
    }

    // Поворот поддерева вправо от узла
    #rotateRight(node) {
        const leftChild = node.left;
        if (!leftChild) {
            throw new Error(`У узла ${node.value} нет левого потомка`)
        }
        const parent = node.parent;
        if (parent) {
            const parentSlot = this.#parentSlot(node);
            parent[parentSlot] = leftChild;
        } else {
            this.#leader = leftChild;
            this.#leader.parent = null;
        }
        leftChild.parent = parent;
        const leftChildRight = leftChild.right;
        leftChild.right = node;
        node.parent = leftChild;
        node.left = null;
        if (leftChildRight) {
            node.left = leftChildRight;
            leftChildRight.parent = node;
        }
        this.#updateNodeHeight(node);
        this.#updateNodeHeight(leftChild);
        if (parent) {
            this.#updateNodeHeight(parent);
        }
    }

    balanced() {
        let balanced = true;
        this.traverse(els => {
            els.forEach(el => {
                if (balanced) {
                    balanced = Math.abs((el?.left?.subtreeHeight ?? 0) - (el?.right?.subtreeHeight ?? 0)) <= 2;
                }
            });
            if (!balanced) {
                return false;
            }
        })
        return balanced;
    }

    elementsSorted(exclude = []) {
        let elements = [];
        this.traverse((els) => {
            elements = elements.concat(els.map(el => el.value).filter(el => {
                if (exclude.length) {
                    return !exclude.includes(el);
                }
                return el;
            }))
        });
        elements.sort((a, b) => a - b);
        return [...Array.from(new Set(elements))];
    }
}
