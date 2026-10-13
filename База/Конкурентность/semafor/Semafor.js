class Semafor {
    // Множество активных промисов
    activePromises = new Set();
    // Очередь ожидающих промисов
    delayedPromises = [];
    #size = 0;

    constructor(size) {
        this.#size = size;
        this.schedule = this.promiseDone.bind(this);
    }

    lock() {
        const thePromise = new Promise(r => {
            return () => {
                this.promiseDone(thePromise);
            };
        });
        return thePromise;
    }

    promiseDone(thePromise) {
        this.activePromises.delete(thePromise);
        if (this.delayedPromises.length) {
            const nextPromise = this.delayedPromises.shift();
            this.activePromises.add(nextPromise);
        }
    }
}
