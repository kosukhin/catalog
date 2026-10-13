class Semafor {
    // Множество активных промисов
    activePromises = new Set();
    // Очередь ожидающих промисов
    delayedPromises = [];
    #size = 0;

    constructor(size) {
        this.#size = size;
    }

    lock() {
        const unlock = null;
        new Promise(r => {
            unlock = r;
        });
    }
}
