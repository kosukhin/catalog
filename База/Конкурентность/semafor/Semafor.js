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
        const unlock = null;
        const thePromise = new Promise(r => {
            unlock = () => {
                r();
                this.promiseDone(thePromise);
            };
        });
        if (this.activePromises.size < this.#size) {

        } else {

        }
    }

    promiseDone(thePromise) {
        this.activePromises.delete(thePromise);
        if (this.delayedPromises.length) {
            const nextPromise = this.delayedPromises.shift();
            
        }
    }
}
