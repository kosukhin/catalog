import { TreeSet } from './TreeSet.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TreeSet', () => {
  it('корректный поворот дерева', () => {
    const tree = new TreeSet();
    tree.add(1);
    tree.add(4);
    tree.add(21);
    // 4 потому что балансировка должна сработать
    assert.equal(tree.leader().value, 4);
  });

  it('содержание элемента в множестве', () => {
    const tree = new TreeSet();
    tree.add(1);
    tree.add(4);
    tree.add(21);

    assert.equal(tree.contains(4), true);
    assert.equal(tree.contains(19), false);
    assert.equal(tree.contains(21), true);
  });

  it('корректная балансировка', () => {
    const tree = new TreeSet();
    tree.add(1);
    tree.add(4);
    tree.add(21);
    tree.add(7);
    tree.add(19);
    tree.add(22);

    assert.equal(tree.leader().subtreeHeight, 2);
  })
});
