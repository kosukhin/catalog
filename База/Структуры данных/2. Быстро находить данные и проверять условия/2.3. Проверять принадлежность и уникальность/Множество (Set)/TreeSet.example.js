import { printAsciiTree } from 'binary-tree-printer';
import { TreeSet } from './TreeSet.js';

console.log('Tree Set')

const tree = new TreeSet(true);

tree.add(1);
console.log(printAsciiTree(tree.leader()));

tree.add(4);
console.log(printAsciiTree(tree.leader()));

tree.add(21);
console.log(printAsciiTree(tree.leader()));

tree.add(7);
console.log(printAsciiTree(tree.leader()));

tree.add(19);
console.log(printAsciiTree(tree.leader()));

tree.add(22);
console.log(printAsciiTree(tree.leader()));

tree.add(25);
console.log(printAsciiTree(tree.leader()));

tree.add(10);
console.log(printAsciiTree(tree.leader()));

tree.add(26);
console.log(printAsciiTree(tree.leader()));

tree.add(27);
console.log(printAsciiTree(tree.leader()));

tree.add(28);
console.log(printAsciiTree(tree.leader()));

tree.add(11);
console.log(printAsciiTree(tree.leader()));

tree.add(12);
console.log(printAsciiTree(tree.leader()));

console.log('have 4', tree.contains(4));
console.log('have 24', tree.contains(24));
console.log('have 12', tree.contains(12));

tree.delete(26);
console.log(printAsciiTree(tree.leader()));

tree.delete(22);
console.log(printAsciiTree(tree.leader()));

tree.delete(25);
console.log(printAsciiTree(tree.leader()));

tree.delete(10);
console.log(printAsciiTree(tree.leader()));
