import { describe, expect, it } from 'vitest';
import { DEFAULT_OBJECTIVE_WEIGHTS } from './objectives';
import { mergeOptimizerPins, parseObjectiveWeights } from './optimizerState';

describe('mergeOptimizerPins', () => {
  it('keeps user pins when scenario fields overlap', () => {
    const custom = mergeOptimizerPins('p2', false, { utilization: false, margin: false });
    const merged = mergeOptimizerPins('p2', false, custom);
    expect(merged.utilization).toBe(false);
    expect(merged.margin).toBe(false);
  });
});

describe('parseObjectiveWeights', () => {
  it('normalizes partial weights', () => {
    const w = parseObjectiveWeights({ profit: 0.5, price: 0.5, ops: 0, stability: 0 });
    expect(w.profit + w.price + w.ops + w.stability).toBeCloseTo(1, 5);
  });

  it('falls back to defaults for invalid input', () => {
    expect(parseObjectiveWeights(null)).toEqual(DEFAULT_OBJECTIVE_WEIGHTS);
  });
});
