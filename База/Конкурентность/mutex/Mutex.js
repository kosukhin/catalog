class Mutex {
    promise = Promise.resolve();

    // Вернет функцию unlock
    lock() {
        let unlock = null;
        this.promise = this.promise.then(() => new Promise((resolve) => {
            unlock = resolve;
        }));
        return unlock;
    }
}

const m1 = new Mutex();


