export function balanced(tree) {
    let balanced = false;
    tree.traverse(els => {
        els.forEach(el => {
            
        });
        if (!balanced) {
            return false;
        }
    })
    return balanced;
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
