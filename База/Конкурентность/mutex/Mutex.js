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
    console.log('do long', this.name);
    unlock();
}

async function short(params) {
    const unlock = await this.lock();
    console.log('do short', this.name);
    unlock();
}

long.call(m1);
short.call(m1);

long.call(fm1);
short.call(fm1);
