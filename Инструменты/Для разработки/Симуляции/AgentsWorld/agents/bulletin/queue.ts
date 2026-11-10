export interface BulletinQueue {
    readonly waiting: Map<string, string[]>;
}

export function enqueue(queue: BulletinQueue, kind: string, replyTo: string): void {
    const list = queue.waiting.get(kind);
    if (list === undefined) {
        queue.waiting.set(kind, [replyTo]);
        return;
    }
    list.push(replyTo);
}

export function dequeue(queue: BulletinQueue, kind: string): string | undefined {
    const list = queue.waiting.get(kind);
    const replyTo = list?.shift();
    if (list !== undefined && list.length === 0) {
        queue.waiting.delete(kind);
    }
    return replyTo;
}

export function pendingCount(queue: BulletinQueue): number {
    let total = 0;
    for (const list of queue.waiting.values()) {
        total += list.length;
    }
    return total;
}
