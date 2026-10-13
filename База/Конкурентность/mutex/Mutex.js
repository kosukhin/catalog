class Mutex {
    name = 'Real Mutex';

    promise = Promise.resolve();

    // Вернет функцию unlock
    lock() {
        let unlock = null;
        const promise = new Promise((resolve) => {
            unlock = resolve;
        });
        const resultPromise = this.promise.then(() => unlock);
        this.promise = promise;
        return resultPromise;
    }
}

class FakeMutex {
    name = 'Fake Mutex';

    lock() {
        return () => { }
    }
}

const m1 = new Mutex();
const fm1 = new FakeMutex();

async function long() {
    const unlock = await this.lock();
    await new Promise(r => {
        setTimeout(r, 2000);
    })
    console.log('do long', this.name);
    unlock();
}

async function short(params) {
    const unlock = await this.lock();
    console.log('do short', this.name);
    unlock();
}

async function batch(cb, name) {
    const unlock = await this.lock();
    console.log('========================');
    console.log('doing batch: ', name);
    await cb();
    console.log('========================');
    unlock();
}

const mbatch = new Mutex();

batch.call(mbatch, () => {
    long.call(m1);
    return short.call(m1);
}, 'Real Mutex');

batch.call(mbatch, () => {
    long.call(fm1);
    return short.call(fm1);
}, 'Fake Mutex');
