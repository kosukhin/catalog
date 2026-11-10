export function waitFor(marks: Set<number>, expected: number, setWaiter: (waiter: () => void) => void): Promise<void> {
    return new Promise((resolve) => {
        const check = (): void => {
            if (marks.size >= expected) {
                resolve();
            }
        };
        setWaiter(check);
        check();
    });
}
