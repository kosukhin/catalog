class Mutex {
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
    lock() {
        return () => { }
    }
}

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
    const m1 = new Mutex();
    return Promise.all([
        long.call(m1),
        short.call(m1)
    ]);
}, 'Real Mutex');

batch.call(mbatch, () => {
    const fm1 = new FakeMutex();
    return Promise.all([
        long.call(fm1),
        short.call(fm1)
    ]);
}, 'Fake Mutex');
