import { printAsciiTree } from 'binary-tree-printer';
import { TreeSet } from './TreeSet.js';

console.log('Tree Set')

const tree = new TreeSet(true);

tree.add(21);
tree.add(4);
tree.add(7);
tree.add(1);
tree.add(27);
tree.add(28);
console.log(printAsciiTree(tree.leader()));
console.log('balanced', tree.balanced());

tree.delete(7);
console.log(printAsciiTree(tree.leader()));
console.log('balanced', tree.balanced());

tree.delete(21);
console.log(printAsciiTree(tree.leader()));
console.log('balanced', tree.balanced());
