class Mutex {
    promise = Promise.resolve();

    // Вернет функцию unlock
    lock() {
        let unlock = null;
        const promise = new Promise((resolve) => {
            unlock = resolve;
        })
        this.promise = this.promise.then(() => {
            return new Promise(r => {
                setTimeout(r, 1000);
            })
        }).then(() => promise);
        return unlock;
    }
}

class FakeMutex {
    lock() {
        return () => {}
    }
}

const m1 = new Mutex();
const fm1 = new FakeMutex();

async function long() {
    const unlock = await this.lock();
    await new Promise(r => {
        setTimeout(r, 2000);
    })
    console.log('do long');
    unlock();
}

async function short(params) {
    const unlock = await this.lock();
    console.log('do short');
    unlock();
}

long.call(m1, 1);
short.call(m1, 2);
