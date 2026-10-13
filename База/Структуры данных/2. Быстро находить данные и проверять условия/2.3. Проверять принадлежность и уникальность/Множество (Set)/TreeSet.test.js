import { TreeSet } from './TreeSet.js';
import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TreeSet', () => {
  it('должна корректно складывать два числа', () => {
    assert.equal(sum(1, 2), 3);
  });
});
