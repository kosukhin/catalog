/**
 * Префиксное дерево (Trie, «бор», «луч») — структура данных для хранения
 * набора строк с быстрым поиском по префиксу и проверкой принадлежности слова.
 *
 * Идея: общие префиксы слов хранятся один раз, а не дублируются.
 * Каждый узел дерева соответствует одному символу, а путь от корня до
 * узла — префиксу строки. Признак isEndOfWord отмечает конец слова.
 *
 * Пример для слов ["cat", "car", "dog"]:
 *
 *             root
 *            /    \
 *           c      d
 *          / \      \
 *         a   a      o
 *        /     \      \
 *       t       r      g
 *      (*)     (*)    (*)
 *
 * где (*) — терминальный узел (конец слова).
 */

/** Узел префиксного дерева. */
export class TrieNode {
    constructor() {
        /** Отображение «символ -> дочерний узел». */
        this.children = new Map();
        /** Является ли узел концом какого-либо слова. */
        this.isEndOfWord = false;
        /** Значение, привязанное к слову (если слово добавлено с value). */
        this.value = null;
    }
}

export class Trie {
    /** Корень дерева — соответствует пустой строке. */
    #root = new TrieNode();
    /** Количество уникальных слов в дереве. */
    #size = 0;

    /**
     * Добавляет слово в дерево.
     * Сложность: O(len(word)).
     *
     * @param {string} word
     * @param {*} [value] — необязательное значение, привязанное к слову.
     * @returns {this} — позволяет строить цепочки вызовов.
     */
    insert(word, value = null) {
        let node = this.#root;

        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }

        // Если слово встретилось впервые — увеличиваем счётчик.
        if (!node.isEndOfWord) {
            node.isEndOfWord = true;
            this.#size += 1;
        }
        node.value = value;

        return this;
    }

    /**
     * Проверяет, содержится ли слово целиком в дереве.
     * Сложность: O(len(word)).
     *
     * @param {string} word
     * @returns {boolean}
     */
    search(word) {
        const node = this.#traverse(word);
        return node !== null && node.isEndOfWord;
    }

    /**
     * Возвращает значение, привязанное к слову, либо undefined.
     * @param {string} word
     * @returns {*}
     */
    get(word) {
        const node = this.#traverse(word);
        return node && node.isEndOfWord ? node.value : undefined;
    }

    /**
     * Проверяет, есть ли в дереве хотя бы одно слово, начинающееся с prefix.
     * Сложность: O(len(prefix)).
     *
     * @param {string} prefix
     * @returns {boolean}
     */
    startsWith(prefix) {
        // Пустая строка является префиксом любого слова, поэтому
        // возвращаем true только если дерево непустое.
        if (prefix === '') {
            return this.#size > 0;
        }
        return this.#traverse(prefix) !== null;
    }

    /**
     * Удаляет слово из дерева (и «подчищает» ставшие ненужными узлы).
     * Сложность: O(len(word)).
     *
     * @param {string} word
     * @returns {boolean} — true, если слово существовало и было удалено.
     */
    delete(word) {
        const status = { found: false };
        this.#delete(this.#root, word, 0, status);
        return status.found;
    }

    /**
     * Возвращает все слова с заданным префиксом (в алфавитном порядке).
     * Используется для автодополнения (autocomplete).
     *
     * @param {string} prefix
     * @returns {string[]}
     */
    wordsWithPrefix(prefix) {
        const node = this.#traverse(prefix);
        if (node === null) {
            return [];
        }

        const result = [];
        this.#collect(node, prefix, result);
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
     * Количество узлов дерева (включая корень). Удобно для оценки «веса»
     * структуры: в обычном trie узлов больше, чем в Radix Tree.
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
     * Проходит по символам строки и возвращает узел, соответствующий всей
     * строке, либо null, если такого пути в дереве нет.
     * @param {string} str
     * @returns {TrieNode|null}
     */
    #traverse(str) {
        let node = this.#root;
        for (const char of str) {
            if (!node.children.has(char)) {
                return null;
            }
            node = node.children.get(char);
        }
        return node;
    }

    /**
     * Рекурсивно собирает все слова из поддерева node.
     * @param {TrieNode} node
     * @param {string} prefix — строка, накопленная по пути от корня к node.
     * @param {string[]} result — массив, куда складываются слова.
     */
    #collect(node, prefix, result) {
        if (node.isEndOfWord) {
            result.push(prefix);
        }
        for (const [char, child] of node.children) {
            this.#collect(child, prefix + char, result);
        }
    }

    /**
     * Рекурсивно удаляет слово, начиная с узла node на глубине depth.
     *
     * Возвращает true, если после удаления текущий узел стал «пустым»
     * (не терминальный и без детей) — тогда родитель может его удалить.
     * Факт удаления слова фиксируется отдельно в объекте status.found,
     * потому что возвращаемое значение относится к «подчистке» узлов,
     * а не к успешности операции.
     *
     * @param {TrieNode} node
     * @param {string} word
     * @param {number} depth
     * @param {{ found: boolean }} status
     * @returns {boolean} — нужно ли родителю удалить этот узел.
     */
    #delete(node, word, depth, status) {
        if (depth === word.length) {
            // Дошли до конца слова.
            if (!node.isEndOfWord) {
                return false; // такого слова нет.
            }
            node.isEndOfWord = false;
            node.value = null;
            this.#size -= 1;
            status.found = true;
            // Узел можно удалить, если у него больше нет детей.
            return node.children.size === 0;
        }

        const char = word[depth];
        const child = node.children.get(char);
        if (!child) {
            return false; // пути нет — слово не существует.
        }

        const shouldDeleteChild = this.#delete(child, word, depth + 1, status);

        if (shouldDeleteChild) {
            node.children.delete(char);
            // Текущий узел тоже можно удалить, если он не конец слова
            // и у него не осталось детей.
            return !node.isEndOfWord && node.children.size === 0;
        }

        return false;
    }
}
