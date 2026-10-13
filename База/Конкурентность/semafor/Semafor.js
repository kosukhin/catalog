class Semafor {
    // Множество активных промисов
    activePromises = new Set();
    // Очередь ожидающих промисов
    delayedPromises = [];
    #size = 0;

    constructor(size) {
        this.#size = size;
        this.schedule = this.schedule.bind(this);
    }

    lock() {
        const unlock = null;
        const thePromise = new Promise(r => {
            unlock = r;
        });
        if (this.activePromises.size < this.#size) {

        } else {

        }
    }

    schedule() {

    }
}
