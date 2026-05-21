import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './constants';
import { DEFAULT_OBJECTIVE_WEIGHTS, evaluateBalancedObjective } from './objectives';
import { bruteForceSearch, createRng, runSearch } from './search';
import { randomParamNearBaseline, snapParam } from './paramBounds';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(99);
    const b = createRng(99);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('randomParamNearBaseline', () => {
  it('stays within radius of baseline on the slider grid', () => {
    const bound = { min: 0.1, max: 0.7, step: 0.05 };
    const baseline = 0.3;
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const v = randomParamNearBaseline(baseline, bound, 0.35, rng);
      expect(v).toBeGreaterThanOrEqual(bound.min);
      expect(v).toBeLessThanOrEqual(bound.max);
      expect(v).toBe(snapParam(v, bound));
    }
  });
});

describe('runSearch', () => {
  const weights = DEFAULT_OBJECTIVE_WEIGHTS;
  const scenario = 'p2' as const;
  const hwFromComponents = false;

  it('finds better margin on a tiny grid via brute force', () => {
    const baseline = { ...DEFAULT_PARAMS, margin: 0.2 };
    const freeKeys = ['margin'] as (keyof typeof DEFAULT_PARAMS)[];
    const result = bruteForceSearch({
      baseline,
      freeKeys,
      weights,
      scenario,
      hwFromComponents,
      topK: 5,
    });
    expect(result.top.length).toBeGreaterThan(0);
    const baselineProfit = evaluateBalancedObjective(baseline, {
      baseline,
      freeKeys,
      weights,
      scenario,
      hwFromComponents,
    }).metrics.fleetProfitDzd;
    expect(result.top[0].metrics.fleetProfitDzd).toBeGreaterThanOrEqual(baselineProfit);
  });

  it('runSearch improves or matches baseline with one free param', () => {
    const baseline = { ...DEFAULT_PARAMS, utilization: 0.5, margin: 0.25 };
    const freeKeys = ['utilization'] as (keyof typeof DEFAULT_PARAMS)[];
    const result = runSearch({
      baseline,
      freeKeys,
      weights,
      scenario,
      hwFromComponents,
      samples: 300,
      seed: 7,
      topK: 3,
    });
    expect(result.top.length).toBeGreaterThan(0);
    if (result.improved) {
      expect(result.top[0].score).toBeGreaterThan(result.baselineScore);
    }
  });

  it('rejects infeasible high margin in brute force top results', () => {
    const baseline = { ...DEFAULT_PARAMS, margin: 0.3 };
    const freeKeys = ['margin'] as (keyof typeof DEFAULT_PARAMS)[];
    const result = bruteForceSearch({
      baseline,
      freeKeys,
      weights,
      scenario,
      hwFromComponents,
      topK: 20,
    });
    for (const row of result.top) {
      expect(row.params.margin).toBeLessThanOrEqual(0.45);
      expect(row.params.margin).toBeGreaterThanOrEqual(0.15);
    }
  });
});
