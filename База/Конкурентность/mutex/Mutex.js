class Mutex {
    promise = Promise.resolve();

    // Вернет функцию unlock
    lock() {
        let unlock = null;
        const promise = new Promise((resolve) => {
            unlock = resolve;
        })
        this.promise = this.promise.then(() => promise);
        return unlock;
    }
}

const m1 = new Mutex();

async function print(num) {
    const unlock = await this.lock();
    console.log('done', num);
    unlock();
}

print.call(m1, 1);

setTimeout(() => {
    print.call(m1, 2);
}, 300);
