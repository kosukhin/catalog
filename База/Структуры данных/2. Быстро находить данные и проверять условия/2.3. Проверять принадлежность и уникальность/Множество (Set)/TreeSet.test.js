import { TreeSet } from './TreeSet.js';
import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TreeSet', () => {
  it('корректный поворот дерева', () => {
    const tree = new TreeSet();
    tree.add(1);
    tree.add(4);
    tree.add(21);
    expect.equals(tree.leader().value, 4);
  });
});
