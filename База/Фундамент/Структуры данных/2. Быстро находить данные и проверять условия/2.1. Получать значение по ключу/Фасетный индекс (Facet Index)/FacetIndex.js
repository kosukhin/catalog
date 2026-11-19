/**
 * Фасетный индекс — набор инвертированных индексов по атрибутам (фасетам).
 *
 * Для каждого поля хранит отображение `значение -> Set<docId>`, а прямой
 * индекс `docId -> { поле -> значения }` нужен для удаления и обновления.
 * В отличие от инвертированного индекса умеет считать количество документов
 * для каждого значения фасета (drill-down: при подсчёте фильтр по самому
 * полю игнорируется).
 */
export class FacetIndex {
    constructor() {
        // поле -> (значение -> множество идентификаторов документов)
        this._postings = new Map();
        // docId -> (поле -> множество значений) — прямой индекс
        this._documents = new Map();
    }

    /**
     * Добавляет документ с атрибутами. Если документ с таким id уже есть,
     * его прежние значения заменяются новыми.
     * @param {number|string} docId
     * @param {Record<string, unknown|unknown[]>} attributes
     * @returns {this}
     */
    addDocument(docId, attributes) {
        if (this._documents.has(docId)) {
            this.removeDocument(docId);
        }

        const valuesByField = new Map();

        for (const [field, rawValue] of Object.entries(attributes ?? {})) {
            const values = normalizeValues(rawValue);
            if (values.length === 0) continue;

            let postings = this._postings.get(field);
            if (!postings) {
                postings = new Map();
                this._postings.set(field, postings);
            }

            for (const value of values) {
                let docs = postings.get(value);
                if (!docs) {
                    docs = new Set();
                    postings.set(value, docs);
                }
                docs.add(docId);
            }

            valuesByField.set(field, new Set(values));
        }

        this._documents.set(docId, valuesByField);

        return this;
    }

    /**
     * Удаляет документ из всех фасетов.
     * @param {number|string} docId
     * @returns {boolean} был ли документ в индексе
     */
    removeDocument(docId) {
        const valuesByField = this._documents.get(docId);
        if (!valuesByField) return false;

        for (const [field, values] of valuesByField) {
            const postings = this._postings.get(field);
            if (!postings) continue;

            for (const value of values) {
                const docs = postings.get(value);
                if (!docs) continue;

                docs.delete(docId);
                if (docs.size === 0) postings.delete(value);
            }

            if (postings.size === 0) this._postings.delete(field);
        }

        this._documents.delete(docId);

        return true;
    }

    /**
     * Поиск документов по фасетам.
     *
     * Значения внутри одного поля объединяются через OR, разные поля —
     * через AND. Пустой объект фильтров возвращает все документы.
     * @param {Record<string, unknown|unknown[]>} [filters]
     * @returns {Array} отсортированные идентификаторы документов
     */
    search(filters = {}) {
        const active = normalizeFilters(filters);
        if (active.length === 0) {
            return sortValues(this._documents.keys());
        }

        return sortValues(this._intersectAll(active));
    }

    /**
     * Количество документов для каждого значения фасета.
     *
     * Фильтр по самому полю игнорируется — это и есть drill-down:
     * после выбора значения остальные значения сохраняют свои счётчики.
     * Значения с нулевым счётчиком не выбрасываются.
     * @param {string} field
     * @param {Record<string, unknown|unknown[]>} [filters]
     * @returns {Array<{ value: unknown, count: number }>} по возрастанию значения
     */
    counts(field, filters = {}) {
        const postings = this._postings.get(field);
        if (!postings) return [];

        const otherFilters = normalizeFilters(filters)
            .filter(([name]) => name !== field);
        const base = otherFilters.length === 0
            ? null
            : this._intersectAll(otherFilters);

        return sortValues(postings.keys()).map((value) => {
            const docs = postings.get(value);

            return {
                value,
                count: base === null ? docs.size : countIntersection(docs, base),
            };
        });
    }

    /**
     * Значения фасета с самыми большими счётчиками.
     * При равенстве счётчиков работает сортировка по значению.
     * @param {string} field
     * @param {Record<string, unknown|unknown[]>} [filters]
     * @param {number} [limit]
     * @returns {Array<{ value: unknown, count: number }>}
     */
    topValues(field, filters = {}, limit = Infinity) {
        return this.counts(field, filters)
            .sort((a, b) => b.count - a.count || compareValues(a.value, b.value))
            .slice(0, limit < 0 ? 0 : limit);
    }

    /**
     * Все значения фасета, отсортированные по возрастанию.
     * @param {string} field
     * @returns {Array}
     */
    values(field) {
        const postings = this._postings.get(field);
        return postings ? sortValues(postings.keys()) : [];
    }

    /**
     * Все поля (фасеты), отсортированные по возрастанию.
     * @returns {string[]}
     */
    fields() {
        return [...this._postings.keys()].sort();
    }

    /**
     * Все идентификаторы документов, отсортированные.
     * @returns {Array}
     */
    documents() {
        return sortValues(this._documents.keys());
    }

    /**
     * Количество документов в индексе.
     * @returns {number}
     */
    size() {
        return this._documents.size;
    }

    /**
     * Проверяет наличие документа в индексе.
     * @param {number|string} docId
     * @returns {boolean}
     */
    has(docId) {
        return this._documents.has(docId);
    }

    /**
     * Объединение постинг-листов всех значений поля (OR внутри поля).
     * @param {string} field
     * @param {Array} values
     * @returns {Set}
     */
    _union(field, values) {
        const union = new Set();
        const postings = this._postings.get(field);
        if (!postings) return union;

        for (const value of values) {
            const docs = postings.get(value);
            if (!docs) continue;

            for (const docId of docs) union.add(docId);
        }

        return union;
    }

    /**
     * Пересечение всех фильтров (AND между полями).
     * Начинает с самого короткого результата — это быстрее.
     * @param {Array<[string, Array]>} active
     * @returns {Set}
     */
    _intersectAll(active) {
        const unions = active.map(([field, values]) => this._union(field, values));
        unions.sort((a, b) => a.size - b.size);

        let result = unions[0];
        for (let i = 1; i < unions.length && result.size > 0; i += 1) {
            result = intersect(result, unions[i]);
        }

        return result;
    }
}

/**
 * Приводит значение атрибута к массиву уникальных значений.
 * `null` и `undefined` отбрасываются.
 * @param {unknown|unknown[]} value
 * @returns {Array}
 */
function normalizeValues(value) {
    const values = Array.isArray(value) ? value : [value];

    return [
        ...new Set(values.filter((item) => item !== undefined && item !== null)),
    ];
}

/**
 * Приводит объект фильтров к парам «поле — массив значений»,
 * пропуская поля без значений.
 * @param {Record<string, unknown|unknown[]>} filters
 * @returns {Array<[string, Array]>}
 */
function normalizeFilters(filters) {
    return Object.entries(filters ?? {})
        .map(([field, value]) => [field, normalizeValues(value)])
        .filter(([, values]) => values.length > 0);
}

/**
 * Пересечение двух множеств.
 * @param {Set} a
 * @param {Set} b
 * @returns {Set}
 */
function intersect(a, b) {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    const result = new Set();

    for (const item of small) {
        if (large.has(item)) result.add(item);
    }

    return result;
}

/**
 * Мощность пересечения двух множеств без создания нового множества.
 * @param {Set} a
 * @param {Set} b
 * @returns {number}
 */
function countIntersection(a, b) {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let count = 0;

    for (const item of small) {
        if (large.has(item)) count += 1;
    }

    return count;
}

/**
 * Сравнивает значения так, чтобы корректно сортировались и числа, и строки.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
function compareValues(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Возвращает отсортированный массив значений итератора.
 * @param {Iterable} values
 * @returns {Array}
 */
function sortValues(values) {
    return [...values].sort(compareValues);
}
