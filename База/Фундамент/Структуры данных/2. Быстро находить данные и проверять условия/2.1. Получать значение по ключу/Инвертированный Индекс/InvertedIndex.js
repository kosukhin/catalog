/**
 * Инвертированный индекс — структура данных, сопоставляющая термин
 * со списком идентификаторов документов, в которых он встречается.
 *
 * Хранит внутри `термин -> Set<docId>` (постинг-лист), где Set
 * гарантирует уникальность документов, а Map — быстрый доступ по ключу.
 */
export class InvertedIndex {
    /**
     * @param {{ tokenize?: (text: string) => string[] }} [options]
     */
    constructor({ tokenize } = {}) {
        // термин -> множество идентификаторов документов
        this._postings = new Map();
        // все идентификаторы документов, добавленные в индекс
        this._documents = new Set();
        this._tokenize = tokenize ?? defaultTokenizer;
    }

    /**
     * Добавляет документ в индекс, разбивая его текст на термины.
     * @param {number|string} docId
     * @param {string} text
     * @returns {this}
     */
    addDocument(docId, text) {
        this._documents.add(docId);

        for (const term of this._tokenize(text)) {
            if (!this._postings.has(term)) {
                this._postings.set(term, new Set());
            }
            this._postings.get(term).add(docId);
        }

        return this;
    }

    /**
     * Возвращает отсортированный список документов, содержащих термин.
     * @param {string} term
     * @returns {Array}
     */
    search(term) {
        return this.postings(term);
    }

    /**
     * Пересечение (AND): документы, содержащие все переданные термины.
     * @param {string[]} terms
     * @returns {Array}
     */
    searchAll(terms) {
        if (terms.length === 0) return [];

        const postings = terms.map((term) => this._postings.get(this._normalizeTerm(term)));
        // если хотя бы один термин отсутствует — пересечение пустое
        if (postings.some((set) => !set)) return [];

        // начинаем с самого короткого постинг-листа — это быстрее
        const [first, ...rest] = postings.sort((a, b) => a.size - b.size);
        const intersection = new Set(
            [...first].filter((docId) => rest.every((set) => set.has(docId)))
        );

        return sortValues(intersection);
    }

    /**
     * Объединение (OR): документы, содержащие хотя бы один из терминов.
     * @param {string[]} terms
     * @returns {Array}
     */
    searchAny(terms) {
        const union = new Set();
        for (const term of terms) {
            const postings = this._postings.get(this._normalizeTerm(term));
            if (postings) {
                for (const docId of postings) union.add(docId);
            }
        }
        return sortValues(union);
    }

    /**
     * Проверяет наличие термина в индексе.
     * @param {string} term
     * @returns {boolean}
     */
    has(term) {
        return this._postings.has(this._normalizeTerm(term));
    }

    /**
     * Постинг-лист термина: отсортированный список документов.
     * @param {string} term
     * @returns {Array}
     */
    postings(term) {
        const set = this._postings.get(this._normalizeTerm(term));
        return set ? sortValues(set) : [];
    }

    /**
     * Сколько документов содержат термин (document frequency).
     * @param {string} term
     * @returns {number}
     */
    documentFrequency(term) {
        const set = this._postings.get(this._normalizeTerm(term));
        return set ? set.size : 0;
    }

    /**
     * Все термины индекса, отсортированные лексикографически.
     * @returns {string[]}
     */
    terms() {
        return [...this._postings.keys()].sort();
    }

    /**
     * Все идентификаторы документов, отсортированные.
     * @returns {Array}
     */
    documents() {
        return sortValues(this._documents);
    }

    /**
     * Количество уникальных терминов в индексе.
     * @returns {number}
     */
    size() {
        return this._postings.size;
    }

    /**
     * Приводит термин запроса к виду, используемому в индексе
     * (тот же токенизатор, что и при добавлении документов).
     * @param {string} term
     * @returns {string}
     */
    _normalizeTerm(term) {
        return this._tokenize(String(term))[0] ?? '';
    }
}

/**
 * Разбивает текст на термины: приводит к нижнему регистру и
 * выделяет последовательности букв и цифр (Unicode).
 * @param {string} text
 * @returns {string[]}
 */
function defaultTokenizer(text) {
    return text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
}

/**
 * Возвращает отсортированный массив значений Set.
 * Корректно работает и для чисел, и для строк.
 * @param {Set} set
 * @returns {Array}
 */
function sortValues(set) {
    return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
