/**
 * Roaring Bitmap (сжатая битовая карта) — структура данных для компактного
 * хранения множества 32-битных неотрицательных целых чисел (uint32) с
 * быстрой проверкой принадлежности, вставкой, удалением и теоретико-
 * множественными операциями (объединение, пересечение, разность).
 *
 * Идея. Всё 32-битное пространство (от 0 до 2^32 - 1) делится на «чанки»
 * по 2^16 = 65536 значений. Чанк определяется старшими 16 битами числа
 * (key), а младшие 16 бит хранятся внутри контейнера. Вместо одного
 * гигантского битового массива на 2^32 бита (512 МБ) хранятся только те
 * чанки, в которых реально есть значения.
 *
 * Внутри чанка используется один из трёх типов контейнеров:
 *
 *  - ArrayContainer   — отсортированный массив 16-битных значений
 *                       (выгоден для разреженных наборов, до 4096 элементов);
 *  - BitmapContainer  — битовая карта на 65536 бит / 2048 машинных слова
 *                       (выгоден для плотных наборов, более 4096 элементов);
 *  - RunContainer     — интервалы [start, length) последовательных значений
 *                       (выгоден для длинных непрерывных диапазонов).
 *
 * Переключение array <-> bitmap происходит автоматически на пороге 4096
 * элементов, а сжатие в run-контейнеры — явным вызовом runOptimize().
 */

// Порог: при превышении array-контейнер переключается в bitmap-контейнер.
const MAX_ARRAY_SIZE = 4096;

// 65536 бит / 32 бита = 2048 машинных слова в bitmap-контейнере.
const BITMAP_WORDS = 2048;

// Максимальное 32-битное значение.
const UINT32_MAX = 0xFFFFFFFF;

/**
 * Количество установленных битов в 32-битном числе (SWAR-алгоритм).
 * @param {number} x
 * @returns {number}
 */
function popcount32(x) {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    x = (x + (x >>> 4)) & 0x0F0F0F0F;
    return (x * 0x01010101) >>> 24;
}

/**
 * Суммарное число установленных битов во всех словах.
 * @param {Uint32Array} words
 * @returns {number}
 */
function countWords(words) {
    let count = 0;
    for (let i = 0; i < words.length; i += 1) {
        count += popcount32(words[i]);
    }
    return count;
}

/**
 * Индекс первого элемента массива, который >= x (нижняя граница).
 * @param {number[]} arr — отсортированный массив.
 * @param {number} x
 * @returns {number}
 */
function lowerBound(arr, x) {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

/**
 * Проверяет, что значение — целое число в диапазоне [0, 2^32 - 1].
 * @param {*} value
 */
function assertUint32(value) {
    const valid =
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= UINT32_MAX;
    if (!valid) {
        throw new TypeError(
            `Значение должно быть целым числом от 0 до ${UINT32_MAX}, получено: ${value}`,
        );
    }
}

/**
 * ArrayContainer — контейнер для разреженных наборов.
 * Хранит отсортированный массив уникальных 16-битных значений.
 * Выгоден, пока элементов не больше MAX_ARRAY_SIZE (4096).
 */
export class ArrayContainer {
    /**
     * @param {number[]} values — отсортированный массив уникальных uint16.
     */
    constructor(values = []) {
        this.values = values;
    }

    /** Количество значений в контейнере. */
    get cardinality() {
        return this.values.length;
    }

    /** Оценка размера в байтах: каждое значение — 2 байта (uint16). */
    sizeInBytes() {
        return this.values.length * 2;
    }

    contains(x) {
        const pos = lowerBound(this.values, x);
        return pos < this.values.length && this.values[pos] === x;
    }

    /**
     * Добавляет значение, сохраняя сортировку и уникальность.
     * При превышении порога переключается в bitmap-контейнер.
     * @param {number} x — младшие 16 бит (0..65535).
     * @returns {ArrayContainer|BitmapContainer}
     */
    add(x) {
        const pos = lowerBound(this.values, x);
        if (pos < this.values.length && this.values[pos] === x) {
            return this; // уже есть
        }
        this.values.splice(pos, 0, x);
        if (this.values.length > MAX_ARRAY_SIZE) {
            return this.toBitmapContainer();
        }
        return this;
    }

    /**
     * Удаляет значение.
     * @param {number} x
     * @returns {{ container: ArrayContainer, existed: boolean }}
     */
    remove(x) {
        const pos = lowerBound(this.values, x);
        if (pos < this.values.length && this.values[pos] === x) {
            this.values.splice(pos, 1);
            return { container: this, existed: true };
        }
        return { container: this, existed: false };
    }

    /** Преобразует в bitmap-контейнер с теми же значениями. */
    toBitmapContainer() {
        const words = new Uint32Array(BITMAP_WORDS);
        for (const v of this.values) {
            words[v >>> 5] |= 1 << (v & 31);
        }
        return new BitmapContainer(words, this.values.length);
    }

    /** Все значения в виде массива (уже отсортированы). */
    toArray() {
        return [...this.values];
    }

    clone() {
        return new ArrayContainer([...this.values]);
    }
}

/**
 * BitmapContainer — контейнер для плотных наборов.
 * Хранит битовую карту на 65536 бит (2048 машинных слова по 32 бита).
 */
export class BitmapContainer {
    #cardinality;

    /**
     * @param {Uint32Array} [words]
     * @param {number} [cardinality] — если не задано, считается по словам.
     */
    constructor(words = null, cardinality = null) {
        this.words = words ?? new Uint32Array(BITMAP_WORDS);
        this.#cardinality = cardinality ?? countWords(this.words);
    }

    /** Количество установленных битов. */
    get cardinality() {
        return this.#cardinality;
    }

    /** Фиксированный размер: 2048 слова * 4 байта = 8192 байта. */
    sizeInBytes() {
        return BITMAP_WORDS * 4;
    }

    contains(x) {
        return ((this.words[x >>> 5] >>> (x & 31)) & 1) === 1;
    }

    /**
     * Устанавливает бит.
     * @param {number} x
     * @returns {this}
     */
    add(x) {
        const wordIndex = x >>> 5;
        const bit = 1 << (x & 31);
        if ((this.words[wordIndex] & bit) === 0) {
            this.words[wordIndex] |= bit;
            this.#cardinality += 1;
        }
        return this;
    }

    /**
     * Сбрасывает бит.
     * При уменьшении до <= MAX_ARRAY_SIZE переключается в array-контейнер.
     * @param {number} x
     * @returns {{ container: BitmapContainer|ArrayContainer, existed: boolean }}
     */
    remove(x) {
        const wordIndex = x >>> 5;
        const bit = 1 << (x & 31);
        if ((this.words[wordIndex] & bit) !== 0) {
            this.words[wordIndex] &= ~bit;
            this.#cardinality -= 1;
            if (this.#cardinality <= MAX_ARRAY_SIZE) {
                return { container: this.toArrayContainer(), existed: true };
            }
            return { container: this, existed: true };
        }
        return { container: this, existed: false };
    }

    /** Преобразует в array-контейнер с теми же значениями. */
    toArrayContainer() {
        return new ArrayContainer(this.toArray());
    }

    /** Все установленные значения (в порядке возрастания). */
    toArray() {
        const result = [];
        for (let w = 0; w < BITMAP_WORDS; w += 1) {
            let word = this.words[w];
            while (word !== 0) {
                const lowest = word & -word;          // младший установленный бит
                const bit = 31 - Math.clz32(lowest);  // его номер (0..31)
                result.push((w << 5) + bit);
                word ^= lowest;                       // сбрасываем этот бит
            }
        }
        return result;
    }

    clone() {
        return new BitmapContainer(new Uint32Array(this.words), this.#cardinality);
    }
}

/**
 * RunContainer — контейнер для длинных непрерывных диапазонов.
 * Хранит массив интервалов { start, length }, где length >= 1,
 * отсортированных по start, непересекающихся и не соседних.
 * Интервал покрывает значения [start, start + length).
 */
export class RunContainer {
    /**
     * @param {{start:number, length:number}[]} runs
     */
    constructor(runs = []) {
        this.runs = runs;
    }

    /** Общее количество значений во всех интервалах. */
    get cardinality() {
        let total = 0;
        for (const run of this.runs) {
            total += run.length;
        }
        return total;
    }

    /** Оценка размера: start (2 байта) + length (2 байта) на интервал. */
    sizeInBytes() {
        return this.runs.length * 4;
    }

    contains(x) {
        let lo = 0;
        let hi = this.runs.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const run = this.runs[mid];
            if (x < run.start) {
                hi = mid - 1;
            } else if (x >= run.start + run.length) {
                lo = mid + 1;
            } else {
                return true;
            }
        }
        return false;
    }

    /**
     * Добавляет значение, при необходимости сливая соседние интервалы.
     * @param {number} x
     * @returns {this}
     */
    add(x) {
        const runs = this.runs;
        let lo = 0;
        let hi = runs.length - 1;
        let pos = runs.length;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (runs[mid].start <= x) {
                lo = mid + 1;
            } else {
                pos = mid;
                hi = mid - 1;
            }
        }
        // pos — индекс первого интервала со start > x (или runs.length).

        if (pos > 0) {
            const prev = runs[pos - 1];
            if (x < prev.start + prev.length) {
                return this; // уже внутри интервала
            }
            if (x === prev.start + prev.length) {
                // x примыкает справа к prev — расширяем его.
                prev.length += 1;
                if (pos < runs.length && runs[pos].start === x + 1) {
                    // сливаем prev со следующим интервалом.
                    prev.length += runs[pos].length;
                    runs.splice(pos, 1);
                }
                return this;
            }
        }

        if (pos < runs.length && runs[pos].start === x + 1) {
            // x примыкает слева к runs[pos] — расширяем его влево.
            runs[pos].start = x;
            runs[pos].length += 1;
            return this;
        }

        runs.splice(pos, 0, { start: x, length: 1 });
        return this;
    }

    /**
     * Удаляет значение, при необходимости разбивая интервал.
     * @param {number} x
     * @returns {{ container: this, existed: boolean }}
     */
    remove(x) {
        const runs = this.runs;
        let lo = 0;
        let hi = runs.length - 1;
        let idx = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const run = runs[mid];
            if (x < run.start) {
                hi = mid - 1;
            } else if (x >= run.start + run.length) {
                lo = mid + 1;
            } else {
                idx = mid;
                break;
            }
        }
        if (idx === -1) {
            return { container: this, existed: false };
        }

        const run = runs[idx];
        if (run.length === 1) {
            runs.splice(idx, 1);
        } else if (x === run.start) {
            run.start += 1;
            run.length -= 1;
        } else if (x === run.start + run.length - 1) {
            run.length -= 1;
        } else {
            // x в середине интервала — разбиваем на два.
            const leftLength = x - run.start;
            const rightStart = x + 1;
            const rightLength = run.length - leftLength - 1;
            run.length = leftLength;
            runs.splice(idx + 1, 0, { start: rightStart, length: rightLength });
        }
        return { container: this, existed: true };
    }

    /** Разворачивает все интервалы в массив значений. */
    toArray() {
        const result = [];
        for (const run of this.runs) {
            for (let v = run.start; v < run.start + run.length; v += 1) {
                result.push(v);
            }
        }
        return result;
    }

    clone() {
        return new RunContainer(
            this.runs.map((run) => ({ start: run.start, length: run.length })),
        );
    }
}

/**
 * Строит контейнер из отсортированного массива уникальных uint16.
 * Разреженный набор -> ArrayContainer, плотный -> BitmapContainer.
 * @param {number[]} sortedValues
 * @returns {ArrayContainer|BitmapContainer}
 */
function arrayToContainer(sortedValues) {
    if (sortedValues.length <= MAX_ARRAY_SIZE) {
        return new ArrayContainer(sortedValues);
    }
    const words = new Uint32Array(BITMAP_WORDS);
    for (const v of sortedValues) {
        words[v >>> 5] |= 1 << (v & 31);
    }
    return new BitmapContainer(words, sortedValues.length);
}

/**
 * Строит RunContainer из отсортированного массива уникальных uint16,
 * сворачивая подряд идущие значения в интервалы.
 * @param {number[]} sortedValues
 * @returns {RunContainer}
 */
function arrayToRunContainer(sortedValues) {
    const runs = [];
    for (const v of sortedValues) {
        const last = runs[runs.length - 1];
        if (last && v === last.start + last.length) {
            last.length += 1;
        } else {
            runs.push({ start: v, length: 1 });
        }
    }
    return new RunContainer(runs);
}

// --- Слияние двух отсортированных массивов (для теоретико-множественных операций) ---

/** Объединение без дубликатов. */
function unionArrays(a, b) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            result.push(a[i]);
            i += 1;
            j += 1;
        } else if (a[i] < b[j]) {
            result.push(a[i]);
            i += 1;
        } else {
            result.push(b[j]);
            j += 1;
        }
    }
    while (i < a.length) result.push(a[i++]);
    while (j < b.length) result.push(b[j++]);
    return result;
}

/** Пересечение. */
function intersectionArrays(a, b) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            result.push(a[i]);
            i += 1;
            j += 1;
        } else if (a[i] < b[j]) {
            i += 1;
        } else {
            j += 1;
        }
    }
    return result;
}

/** Разность: элементы из a, которых нет в b. */
function differenceArrays(a, b) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < a.length) {
        if (j >= b.length || a[i] < b[j]) {
            result.push(a[i]);
            i += 1;
        } else if (a[i] === b[j]) {
            i += 1;
            j += 1;
        } else {
            j += 1;
        }
    }
    return result;
}

/** Симметрическая разность (XOR). */
function symmetricDifferenceArrays(a, b) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            i += 1;
            j += 1;
        } else if (a[i] < b[j]) {
            result.push(a[i]);
            i += 1;
        } else {
            result.push(b[j]);
            j += 1;
        }
    }
    while (i < a.length) result.push(a[i++]);
    while (j < b.length) result.push(b[j++]);
    return result;
}

/**
 * Проверяет, что аргумент является RoaringBitmap.
 * @param {*} other
 */
function assertRoaringBitmap(other) {
    if (!(other instanceof RoaringBitmap)) {
        throw new TypeError('Ожидается RoaringBitmap');
    }
}

/**
 * Разделяет 32-битное значение на старшие (high) и младшие (low) 16 бит,
 * попутно проверяя корректность значения.
 * @param {number} value
 * @returns {{ high: number, low: number }}
 */
function split(value) {
    assertUint32(value);
    return { high: value >>> 16, low: value & 0xFFFF };
}

/**
 * RoaringBitmap — сжатое множество 32-битных неотрицательных целых чисел.
 *
 * Внутри хранит Map: старшие 16 бит (ключ чанка) -> контейнер с младшими
 * 16 битами. Тип контейнера подбирается автоматически по плотности набора,
 * поэтому структура занимает мало памяти и остаётся быстрой.
 */
export class RoaringBitmap {
    /** Чанки: high (старшие 16 бит) -> контейнер младших 16 бит. */
    #containers = new Map();

    /**
     * Создаёт RoaringBitmap из массива значений.
     * @param {number[]} values
     * @returns {RoaringBitmap}
     */
    static fromArray(values) {
        const bitmap = new RoaringBitmap();
        for (const v of values) {
            bitmap.add(v);
        }
        return bitmap;
    }

    /**
     * Добавляет значение. Сложность: O(1) в среднем (поиск чанка по Map).
     * @param {number} value
     * @returns {this} — позволяет строить цепочки вызовов.
     */
    add(value) {
        const { high, low } = split(value);
        let container = this.#containers.get(high) ?? new ArrayContainer();
        container = container.add(low);
        this.#containers.set(high, container);
        return this;
    }

    /**
     * Удаляет значение.
     * @param {number} value
     * @returns {boolean} — true, если значение существовало и было удалено.
     */
    remove(value) {
        const { high, low } = split(value);
        const container = this.#containers.get(high);
        if (!container) {
            return false;
        }
        const { container: next, existed } = container.remove(low);
        if (!existed) {
            return false;
        }
        if (next.cardinality === 0) {
            this.#containers.delete(high);
        } else {
            this.#containers.set(high, next);
        }
        return true;
    }

    /**
     * Проверяет принадлежность значения множеству.
     * @param {number} value
     * @returns {boolean}
     */
    has(value) {
        const { high, low } = split(value);
        const container = this.#containers.get(high);
        return container ? container.contains(low) : false;
    }

    /** Псевдоним has() — как в библиотеках Roaring Bitmaps. */
    contains(value) {
        return this.has(value);
    }

    /** Количество уникальных значений. */
    get size() {
        let total = 0;
        for (const container of this.#containers.values()) {
            total += container.cardinality;
        }
        return total;
    }

    /** Пусто ли множество. */
    isEmpty() {
        return this.#containers.size === 0;
    }

    /** Удаляет все значения. */
    clear() {
        this.#containers.clear();
        return this;
    }

    /** Все значения в порядке возрастания. */
    toArray() {
        const result = [];
        const keys = [...this.#containers.keys()].sort((a, b) => a - b);
        for (const high of keys) {
            // Умножение (а не `high << 16`), чтобы не переполнить знаковый
            // 32-битный сдвиг при high = 65535.
            const base = high * 65536;
            for (const low of this.#containers.get(high).toArray()) {
                result.push(base + low);
            }
        }
        return result;
    }

    /** Независимая копия. */
    clone() {
        const copy = new RoaringBitmap();
        for (const [high, container] of this.#containers) {
            copy.#containers.set(high, container.clone());
        }
        return copy;
    }

    /** Объединение множеств. */
    union(other) {
        assertRoaringBitmap(other);
        return this.#setOperation(other, unionArrays);
    }

    /** Пересечение множеств. */
    intersection(other) {
        assertRoaringBitmap(other);
        return this.#setOperation(other, intersectionArrays);
    }

    /** Разность: элементы this, которых нет в other. */
    difference(other) {
        assertRoaringBitmap(other);
        return this.#setOperation(other, differenceArrays);
    }

    /** Симметрическая разность (XOR). */
    symmetricDifference(other) {
        assertRoaringBitmap(other);
        return this.#setOperation(other, symmetricDifferenceArrays);
    }

    /**
     * Оптимизирует хранение: заменяет array/bitmap-контейнеры на
     * run-контейнеры там, где это выгоднее по памяти (длинные диапазоны).
     * @returns {this}
     */
    runOptimize() {
        for (const [high, container] of this.#containers) {
            if (container instanceof RunContainer) {
                continue;
            }
            const run = arrayToRunContainer(container.toArray());
            if (run.sizeInBytes() < container.sizeInBytes()) {
                this.#containers.set(high, run);
            }
        }
        return this;
    }

    /**
     * Сводка по внутреннему устройству: сколько контейнеров каждого типа
     * и суммарная оценка занимаемой памяти в байтах.
     * @returns {{ containers: number, array: number, bitmap: number, run: number, sizeInBytes: number }}
     */
    stats() {
        const stats = {
            containers: 0,
            array: 0,
            bitmap: 0,
            run: 0,
            sizeInBytes: 0,
        };
        for (const container of this.#containers.values()) {
            stats.containers += 1;
            if (container instanceof ArrayContainer) {
                stats.array += 1;
            } else if (container instanceof BitmapContainer) {
                stats.bitmap += 1;
            } else if (container instanceof RunContainer) {
                stats.run += 1;
            }
            stats.sizeInBytes += container.sizeInBytes();
        }
        return stats;
    }

    /**
     * Применяет бинарную операцию к каждому чанку двух множеств.
     * @param {RoaringBitmap} other
     * @param {Function} merge — слияние двух отсортированных массивов
     *        младших 16 бит.
     * @returns {RoaringBitmap}
     */
    #setOperation(other, merge) {
        const result = new RoaringBitmap();
        const keys = new Set([
            ...this.#containers.keys(),
            ...other.#containers.keys(),
        ]);
        const sortedKeys = [...keys].sort((a, b) => a - b);
        for (const high of sortedKeys) {
            const a = this.#containers.get(high);
            const b = other.#containers.get(high);
            const merged = merge(
                a ? a.toArray() : [],
                b ? b.toArray() : [],
            );
            if (merged.length > 0) {
                result.#containers.set(high, arrayToContainer(merged));
            }
        }
        return result;
    }
}
