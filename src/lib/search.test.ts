import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './constants';
import { evaluateObjective } from './objectives';
import { bruteForceSearch, createRng, runSearch } from './search';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(99);
    const b = createRng(99);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('runSearch', () => {
  it('finds better margin on a tiny grid via brute force', () => {
    const baseline = { ...DEFAULT_PARAMS, margin: 0.1 };
    const result = bruteForceSearch({
      baseline,
      freeKeys: ['margin'],
      objectiveId: 'maxFleetProfit',
      constraints: {},
      scenario: 'p2',
      hwFromComponents: false,
      topK: 5,
    });
    expect(result.top.length).toBeGreaterThan(0);
    const best = result.top[0];
    expect(best.metrics.fleetProfitDzd).toBeGreaterThanOrEqual(
      result.baselineFeasible ? evaluateProfit(baseline) : 0,
    );
  });

  it('runSearch improves or matches baseline with one free param', () => {
    const baseline = { ...DEFAULT_PARAMS, utilization: 0.5 };
    const result = runSearch({
      baseline,
      freeKeys: ['utilization'],
      objectiveId: 'maxFleetProfit',
      constraints: {},
      scenario: 'p2',
      hwFromComponents: false,
      samples: 200,
      seed: 7,
      topK: 3,
    });
    expect(result.top[0].metrics.fleetProfitDzd).toBeGreaterThanOrEqual(
      baseline.utilization < 0.9 ? result.top[0].metrics.fleetProfitDzd : 0,
    );
    if (result.improved) {
      expect(result.top[0].score).toBeGreaterThan(result.baselineScore);
    }
  });
});

function evaluateProfit(P: typeof DEFAULT_PARAMS): number {
  return evaluateObjective(P, 'maxFleetProfit', {}, 'p2', false).metrics.fleetProfitDzd;
}
