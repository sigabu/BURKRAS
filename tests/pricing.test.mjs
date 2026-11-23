import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimate } from '../site/assets/pricing.js';

const base = { service: 'drilling', material: 'concrete', thickness: 20, size: 100, quantity: 1 };
test('minimum quote is respected, no misleading tiny order price', () => {
  const result = calculateEstimate(base);
  assert.deepEqual(result, { individual: false, low: 2500, high: 3300 });
});
test('material, depth, diameter and quantity increase a substantive drilling quote', () => {
  const small = calculateEstimate({ ...base, quantity: 10 });
  for (const changes of [{ material: 'reinforced' }, { thickness: 40 }, { size: 200 }, { quantity: 20 }]) {
    const bigger = calculateEstimate({ ...base, quantity: 10, ...changes });
    assert.ok(bigger.low > small.low);
    assert.ok(bigger.high >= bigger.low);
  }
});
test('fractional cut lengths and areas are accepted', () => {
  assert.ok(calculateEstimate({ ...base, service: 'cutting', size: 3.5 }).low > 2500);
  assert.ok(calculateEstimate({ ...base, service: 'demolition', size: 4.2 }).low > 2500);
});
test('reinforcement never invents a generic quote', () => {
  assert.deepEqual(calculateEstimate({ service: 'reinforcement', material: 'concrete' }), { individual: true, low: null, high: null });
});
test('bad, missing, nonfinite and out-of-range parameters are rejected', () => {
  for (const changes of [{ service: 'unknown' }, { service: 'constructor' }, { material: 'wood' }, { thickness: '' }, { thickness: Infinity }, { thickness: 101 }, { size: 0 }, { size: 401 }, { quantity: 1.2 }, { quantity: 101 }]) {
    assert.throws(() => calculateEstimate({ ...base, ...changes }), RangeError);
  }
});
