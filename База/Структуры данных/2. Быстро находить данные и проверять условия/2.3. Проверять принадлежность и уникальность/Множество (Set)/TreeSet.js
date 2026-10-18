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

const SLOTS = {
    CUR: 'current',
    LFT: 'left',
    RGT: 'right',
};

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

    #deleteNode(node, successor = null) {
        if (!node.parent) {
            this.#leader = successor;
            if (successor) {
                successor.parent = null;
            }
        } else if (successor) {
            const slot = this.#parentSlot(node);
            node.parent[slot] = successor;
            successor.parent = node.parent;
        }
    }

    // Логарифмически ищет узел по значению
    // Если находит то возвращает его, если не находит
    // То возвращает null
    find(candidate, treeNode) {
        if (!treeNode) {
            treeNode = this.#leader;
        }
        const candidateSlot = this.bstSlotRule(candidate, treeNode);
        if (candidateSlot === SLOTS.CUR) {
            return treeNode;
        }
        if (!treeNode[candidateSlot]) {
            return null;
        }
        return this.find(candidate, treeNode[candidateSlot]);
    }

    // ## Закон связей в слотах
    bstSlotRule(candidate, treeNode) {
        if (treeNode.value === candidate) {
            return SLOTS.CUR;
        }
        return candidate < treeNode.value ? SLOTS.LFT : SLOTS.RGT;
    }

    // Слот заполнен
    slotFilled(treeNode, slot) {
        return Boolean(treeNode[slot]);
    }

    // Обход дерева в ширину BFS
    // Передает в cb массив найденных узлов на слое
    // Если cb вернет false поиск прекратить
    traverse(cb) {
        const queue = [this.#leader];
        let interruptedByCb = false;
        while (queue.length && !interruptedByCb) {
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
        return this.#findSlotMostChild(node, SLOTS.LFT);
    }

    findRightMostChild(node) {
        return this.#findSlotMostChild(node, SLOTS.RGT);
    }

    #findSlotMostChild(node, slot) {
        const queue = [node];
        while (queue.length) {
            const currentNode = queue.shift();
            if (currentNode[slot]) {
                queue.push(currentNode[slot]);
            } else {
                return currentNode;
            }
        }
        return node;
    }

    // Поместить элемент в корректную позицию по BST инварианту
    #placeBST(candidate, treeNode) {
        if (this.#leader === null) {
            this.#leader = this.#createNewNode(candidate);
            return;
        }
        if (!treeNode) {
            treeNode = this.#leader;
        }
        const candidateSlot = this.bstSlotRule(candidate, treeNode);
        if (candidateSlot === SLOTS.CUR) {
            return;
        }
        if (this.slotFilled(treeNode, candidateSlot)) {
            this.#placeBST(candidate, treeNode[candidateSlot]);
        } else {
            this.#createNewNode(candidate, treeNode, candidateSlot);
        }
    }

    // Создание нового узла в дереве
    #createNewNode(el, parent, slot) {
        const newNode = new Node(el, null, null, parent);
        newNode.subtreeHeight = 0;
        if (parent && slot) {
            parent[slot] = newNode;
            this.#bubbling(newNode, this.#updateNodeHeight.bind(this));
            this.#rebalance(newNode);
            this.#bubbling(newNode, this.#updateNodeHeight.bind(this));
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
    // ## Закон расчета высоты поддерева
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

    // Вместо старого узла поставить новый
    #replaceNode(oldNode, newNode) {
        const parent = oldNode.parent;
        if (!parent) {
            this.#leader = newNode;
            newNode.parent = null;
            return;
        }
        const parentSlot = this.#parentSlot(oldNode);
        parent[parentSlot] = newNode;
        newNode.parent = parent;
        oldNode.parent = null;
    }

    #inheritNode(parentNode, childNode, slot) {
        childNode.parent = parentNode;
        parentNode[slot] = childNode;
    }

    // Поворот в зависимости от слота
    #rotateSlot(node, slot) {
        const reverseSlot = this.#reverseSlot(slot);
        const reverseChildNode = node[reverseSlot];
        if (!reverseChildNode) {
            throw new Error(`У узла ${node.value} нет ${reverseSlot} потомка`)
        }
        const reverseChildChildNode = reverseChildNode[slot];
        this.#replaceNode(node, reverseChildNode);
        this.#inheritNode(reverseChildNode, node, slot);
        node[reverseSlot] = null;
        if (reverseChildChildNode) {
            this.#inheritNode(node, reverseChildChildNode, reverseSlot);
        }
        this.#updateNodeHeight(node);
        this.#updateNodeHeight(reverseChildNode);
        if (node.parent) {
            this.#updateNodeHeight(node.parent);
        }
    }

    // Поворот поддерева влево от узла
    #rotateLeft(node) {
        this.#rotateSlot(node, SLOTS.LFT);
    }

    // Поворот поддерева вправо от узла
    #rotateRight(node) {
        this.#rotateSlot(node, SLOTS.RGT);
    }

    #reverseSlot(slot) {
        return slot === SLOTS.LFT ? SLOTS.RGT : SLOTS.LFT;
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
