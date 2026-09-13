import assert from 'node:assert/strict';
import test from 'node:test';
import '../public/demo-engine.js';
const d = globalThis.DSADemo;

test('all searches handle found, missing, single-value and equal-value arrays', () => {
  for (const kind of ['linear', 'binary', 'interpolation']) {
    for (const values of [[1], [2, 2, 2], [-4, 0, 3, 7], [1, 2, 100, 9999]]) {
      for (const target of [-5, 0, 1, 2, 3, 7, 99, 9999]) {
        const result = d.search(kind, values, target);
        assert.equal(result.index >= 0, values.includes(target));
        if (result.index >= 0) assert.equal(values[result.index], target);
      }
    }
  }
});
test('invalid and unsorted inputs are rejected', () => {
  for (const raw of ['', '1,no', '1.5', '10000']) assert.throws(() => d.parseList(raw));
  assert.throws(() => d.parseList(Array(13).fill('1').join(',')));
  for (const kind of ['binary', 'interpolation']) assert.throws(() => d.search(kind, [3, 1], 1));
  assert.deepEqual(d.parseList(' -3, 0  5 '), [-3, 0, 5]);
});
test('probing rejects negative keys and handles wraparound, duplicates and full tables', () => {
  assert.throws(() => d.probing([-1, 2, 5], 3));
  assert.deepEqual(d.probing([2, 5, 8], 3).slots, [5, 8, 2]);
  assert.equal(d.probing([1, 1], 3).slots.filter(x => x !== null).length, 2);
  assert.match(d.probing([1, 2, 3], 2).steps.at(-1).message, /Table full/);
  for (const size of [0, 1, 14, 2.5]) assert.throws(() => d.probing([1], size));
});
test('hashSearch builds the table then probes for the target', () => {
  const hit = d.hashSearch([12, 23, 34, 45, 9], 11, 34);
  assert.equal(hit.index, hit.slots.indexOf(34));
  assert.equal(hit.slots[hit.index], 34);
  assert.match(hit.message, /Found 34/);

  const emptySlotStop = d.hashSearch([1, 2, 3], 5, 99);
  assert.equal(emptySlotStop.index, -1);
  assert.match(emptySlotStop.message, /not found/);

  const missingDuplicateKeys = d.hashSearch([1, 1, 1], 3, 1);
  assert.equal(missingDuplicateKeys.slots.filter(x => x !== null).length, 3);
  assert.equal(missingDuplicateKeys.index, 1);

  for (const size of [0, 1, 14, 2.5]) assert.throws(() => d.hashSearch([1], size, 1));
});
test('hashFunction computes division, mid-square and multiplicative addresses', () => {
  const div = d.hashFunction('division', [23, 47, 8], 11);
  assert.deepEqual(div.steps.map(s => s.pos), [23 % 11, 47 % 11, 8 % 11]);
  assert.match(div.message, /division method/);

  const mid = d.hashFunction('midsquare', [1234], 100);
  assert.equal(mid.steps[0].pos, 22);
  assert.ok(mid.steps[0].pos >= 0 && mid.steps[0].pos < 100);

  const mult = d.hashFunction('multiplicative', [15, 61], 11);
  for (const step of mult.steps) assert.ok(step.pos >= 0 && step.pos < 11);

  for (const size of [0, 1, 14, 2.5]) assert.throws(() => d.hashFunction('division', [1], size));
  assert.throws(() => d.hashFunction('nope', [1], 5));
});
test('probeSequence handles quadratic and double hashing without mutating shared state', () => {
  for (const kind of ['quadratic', 'double']) {
    const result = d.probeSequence([12, 23, 34], 11, kind);
    const finalSlots = result.slots;
    assert.equal(finalSlots.filter(x => x !== null).length, 3);
    assert.ok([12, 23, 34].every(k => finalSlots.includes(k)));
    for (const size of [0, 1, 14, 2.5]) assert.throws(() => d.probeSequence([1], size, kind));
  }
  assert.throws(() => d.probeSequence([1], 5, 'linear'));
});
test('chaining inserts at the head and retains repeated keys', () => {
  const result = d.chaining([12, 23, 34], 11);
  assert.deepEqual(result.buckets[1], [34, 23, 12]);
  assert.match(result.message, /3 key/);
  const withDuplicate = d.chaining([5, 5], 11);
  assert.deepEqual(withDuplicate.buckets[5], [5, 5]);
  assert.match(withDuplicate.steps.at(-1).message, /Insert at head/);
  for (const size of [0, 1, 14, 2.5]) assert.throws(() => d.chaining([1], size));
});
