class Semafor {
    // Множество активных ресолверов
    #activeResolvers = new Set();
    // Очередь ожидающих ресолверов
    #delayedResolvers = [];
    // Размер семафора
    #size = 0;

    constructor(size) {
        this.#size = size;
        this.schedule = this.promiseDone.bind(this);
    }

    lock() {
        return new Promise(resolver => {
            if (this.hasFreeSlot()) {
                this.activateResolver(resolver);
            } else {
                this.#delayedResolvers.push(resolver);
            }
        });
    }

    hasFreeSlot() {
        return this.#activeResolvers.size < this.#size;
    }

    activateResolver(resolver) {
        this.#activeResolvers.add(resolver);
        resolver(() => {
            this.promiseDone(resolver);
        });
    }

    promiseDone(resolver) {
        this.#activeResolvers.delete(resolver);
        if (this.#delayedResolvers.length) {
            const nextResolver = this.#delayedResolvers.shift();
            this.activateResolver(nextResolver);
        }
    }
}

async function lockableTest(name, time) {
    const unlock = await this.lock();
    await new Promise((r) => {
        setTimeout(r, time);
    })
    console.log('done', name);
    unlock();
}

const s1 = new Semafor(2);

lockableTest.call(s1, 'one', 2000);
lockableTest.call(s1, 'two', 1000);
lockableTest.call(s1, 'three', 3000);
lockableTest.call(s1, 'four', 0);
