/**
 * Radix Tree (сжатое префиксное дерево, компактный trie, Patricia trie) —
 * вариант префиксного дерева, в котором цепочки узлов с единственным
 * ребёнком «схлопываются» в одно ребро, помеченное целой подстрокой.
 *
 * За счёт этого Radix Tree использует меньше памяти и делает меньше шагов
 * при обходе, чем обычный trie (где на каждый символ приходится узел).
 *
 * Пример. Обычный trie для слов ["romane", "romanus"]:
 *
 *       root
 *        |
 *        r
 *        |
 *        o
 *        |
 *        m
 *        |
 *        a
 *        |
 *        n
 *       / \
 *      e   u
 *     (*)  |
 *          s
 *         (*)
 *
 * Тот же набор слов в Radix Tree:
 *
 *        root
 *         |
 *       roman
 *        / \
 *       e   us
 *      (*)  (*)
 *
 * Каждое ребро хранит подстроку (label), а дети узла ключуются по первому
 * символу своего label — так нужное ребро находится за O(1).
 */

/** Узел Radix Tree. */
export class RadixNode {
    /**
     * @param {string} label — подстрока на ребре от родителя к этому узлу.
     */
    constructor(label = '') {
        /** Подстрока, которую хранит ребро. */
        this.label = label;
        /** Отображение «первый символ label ребёнка -> RadixNode». */
        this.children = new Map();
        /** Является ли узел концом какого-либо слова. */
        this.isEndOfWord = false;
        /** Значение, привязанное к слову. */
        this.value = null;
    }
}

export class RadixTree {
    /** Корень дерева. Его label всегда пустой. */
    #root = new RadixNode();
    /** Количество уникальных слов в дереве. */
    #size = 0;

    /**
     * Добавляет слово в дерево.
     *
     * Алгоритм: идём по слову и по рёбрам, ищем общий префикс.
     *  - если ребро совпало целиком — спускаемся в его узел;
     *  - если совпала только часть ребра — «расщепляем» ребро, вставляя
     *    промежуточный узел с общим префиксом;
     *  - если подходящего ребра нет — создаём новое ребро с остатком слова.
     *
     * Сложность: O(len(word)) в среднем.
     *
     * @param {string} word
     * @param {*} [value] — необязательное значение, привязанное к слову.
     * @returns {this}
     */
    insert(word, value = null) {
        // Пустое слово хранится прямо в корне.
        if (word === '') {
            if (!this.#root.isEndOfWord) {
                this.#root.isEndOfWord = true;
                this.#size += 1;
            }
            this.#root.value = value;
            return this;
        }

        let node = this.#root;
        let i = 0; // позиция в слове, которую ещё нужно разместить

        while (i < word.length) {
            const char = word[i];
            const child = node.children.get(char);

            if (!child) {
                // Ребра с таким первым символом нет — вешаем остаток слова
                // как новое ребро-лист.
                const leaf = new RadixNode(word.slice(i));
                node.children.set(char, leaf);
                node = leaf;
                i = word.length;
                break;
            }

            // Сколько первых символов совпадают у остатка слова и ребра.
            const common = commonPrefixLength(word.slice(i), child.label);

            if (common === child.label.length) {
                // Остаток слова полностью покрывает ребро — спускаемся ниже.
                node = child;
                i += common;
            } else {
                // Ребро совпало лишь частично — расщепляем его.
                // 1) промежуточный узел хранит общий префикс;
                const split = new RadixNode(child.label.slice(0, common));
                // 2) у ребёнка остаётся только «хвост» старого label;
                child.label = child.label.slice(common);
                // 3) промежуточный узел усыновляет старого ребёнка;
                split.children.set(child.label[0], child);
                // 4) заменяем старое ребро промежуточным узлом;
                node.children.set(split.label[0], split);
                // 5) спускаемся в промежуточный узел.
                node = split;
                i += common;
            }
        }

        // Отмечаем конец слова (если оно ещё не было в дереве).
        if (!node.isEndOfWord) {
            node.isEndOfWord = true;
            this.#size += 1;
        }
        node.value = value;

        return this;
    }

    /**
     * Проверяет, содержится ли слово целиком в дереве.
     * @param {string} word
     * @returns {boolean}
     */
    search(word) {
        const { node, matched } = this.#walk(word);
        return node !== null && matched === word.length && node.isEndOfWord;
    }

    /**
     * Возвращает значение, привязанное к слову, либо undefined.
     * @param {string} word
     * @returns {*}
     */
    get(word) {
        const { node, matched } = this.#walk(word);
        return node !== null && matched === word.length && node.isEndOfWord
            ? node.value
            : undefined;
    }

    /**
     * Проверяет, есть ли в дереве хотя бы одно слово с заданным префиксом.
     * Префикс может заканчиваться в середине ребра — это допустимо.
     * @param {string} prefix
     * @returns {boolean}
     */
    startsWith(prefix) {
        if (prefix === '') {
            return this.#size > 0;
        }
        const { node, matched } = this.#walk(prefix);
        return node !== null && matched === prefix.length;
    }

    /**
     * Удаляет слово и восстанавливает «сжатость» дерева:
     *  - пустые нетерминальные узлы удаляются;
     *  - узлы с единственным ребёнком сливаются с ним в одно ребро.
     *
     * @param {string} word
     * @returns {boolean} — true, если слово существовало и было удалено.
     */
    delete(word) {
        if (word === '') {
            if (!this.#root.isEndOfWord) {
                return false;
            }
            this.#root.isEndOfWord = false;
            this.#root.value = null;
            this.#size -= 1;
            return true;
        }

        let node = this.#root;
        let i = 0;
        const parents = []; // узлы-родители на пути (сверху вниз, начиная с корня)

        while (i < word.length) {
            const child = node.children.get(word[i]);
            if (!child || !word.slice(i).startsWith(child.label)) {
                return false; // слова нет в дереве.
            }
            parents.push(node);
            node = child;
            i += child.label.length;
        }

        if (!node.isEndOfWord) {
            return false; // путь есть, но слова (терминального узла) нет.
        }

        node.isEndOfWord = false;
        node.value = null;
        this.#size -= 1;

        // Прореживаем дерево снизу вверх.
        while (parents.length > 0) {
            const parent = parents[parents.length - 1];

            if (node.children.size === 0 && !node.isEndOfWord) {
                // Пустой нетерминальный узел — удаляем ребро у родителя.
                parent.children.delete(node.label[0]);
                node = parent;
                parents.pop();
                continue;
            }

            if (node.children.size === 1 && !node.isEndOfWord) {
                // Узел с единственным ребёнком — сливаем его с ребёнком.
                const onlyChild = node.children.values().next().value;
                node.label = node.label + onlyChild.label;
                node.children = onlyChild.children;
                node.isEndOfWord = onlyChild.isEndOfWord;
                node.value = onlyChild.value;
                node = parent;
                parents.pop();
                continue;
            }

            // Узел терминальный или имеет несколько детей — останавливаемся.
            break;
        }

        return true;
    }

    /**
     * Возвращает все слова с заданным префиксом (в алфавитном порядке).
     * @param {string} prefix
     * @returns {string[]}
     */
    wordsWithPrefix(prefix) {
        let node = this.#root;
        let path = ''; // полная строка, накопленная по рёбрам до node
        let i = 0;

        while (i < prefix.length) {
            const child = node.children.get(prefix[i]);
            if (!child) {
                return [];
            }
            const remaining = prefix.slice(i);

            if (remaining.startsWith(child.label)) {
                // Ребро целиком входит в префикс.
                path += child.label;
                i += child.label.length;
                node = child;
            } else if (child.label.startsWith(remaining)) {
                // Префикс заканчивается в середине ребра — всё поддерево
                // этого ребёнка удовлетворяет префиксу.
                path += child.label;
                node = child;
                i = prefix.length;
            } else {
                // Префикс не совпадает с ребром.
                return [];
            }
        }

        const result = [];
        this.#collect(node, path, result);
        return result.sort();
    }

    /**
     * Возвращает все слова дерева в алфавитном порядке.
     * @returns {string[]}
     */
    words() {
        return this.wordsWithPrefix('');
    }

    /**
     * Количество уникальных слов в дереве.
     * @returns {number}
     */
    get size() {
        return this.#size;
    }

    /**
     * Пусто ли дерево.
     * @returns {boolean}
     */
    isEmpty() {
        return this.#size === 0;
    }

    /**
     * Количество узлов дерева (включая корень). В Radix Tree оно заметно
     * меньше, чем в обычном trie для тех же слов.
     * @returns {number}
     */
    nodeCount() {
        let count = 0;
        const stack = [this.#root];
        while (stack.length > 0) {
            const node = stack.pop();
            count += 1;
            for (const child of node.children.values()) {
                stack.push(child);
            }
        }
        return count;
    }

    /**
     * Идёт по строке, следуя рёбрам.
     * Возвращает узел и число совпавших символов строки.
     *
     * Особенность: если строка заканчивается в середине ребра, возвращается
     * дочерний узел, а matched равен длине строки (частичное совпадение).
     *
     * @param {string} str
     * @returns {{ node: RadixNode|null, matched: number }}
     */
    #walk(str) {
        let node = this.#root;
        let i = 0;

        while (i < str.length) {
            const child = node.children.get(str[i]);
            if (!child) {
                return { node: null, matched: i };
            }

            const remaining = str.slice(i);

            if (remaining.startsWith(child.label)) {
                // Ребро полностью покрывается остатком строки.
                i += child.label.length;
                node = child;
            } else if (child.label.startsWith(remaining)) {
                // Остаток строки целиком лежит внутри ребра.
                return { node: child, matched: i + remaining.length };
            } else {
                // Не совпадает.
                return { node: null, matched: i };
            }
        }

        return { node, matched: i };
    }

    /**
     * Рекурсивно собирает все слова из поддерева node.
     * @param {RadixNode} node
     * @param {string} path — полная строка, накопленная по рёбрам до node.
     * @param {string[]} result
     */
    #collect(node, path, result) {
        if (node.isEndOfWord) {
            result.push(path);
        }
        for (const child of node.children.values()) {
            this.#collect(child, path + child.label, result);
        }
    }
}

/**
 * Длина общего префикса двух строк.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function commonPrefixLength(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) {
        i += 1;
    }
    return i;
}
