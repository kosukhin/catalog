export function balanced(root) {

}

export function elementsSorted(tree, exclude = []) {
    const elements = [];
    tree.traverse((els) => {
        elements.concat(els.filter(el => {
            if (exclude.length) {
                return !exclude.includes(el);
            }
            return el;
        }))
    });
    return elements;
}
