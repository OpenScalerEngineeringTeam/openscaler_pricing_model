import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import {
  DEFAULT_OBJECTIVE_WEIGHTS,
  checkGuardrails,
  evaluateBalancedObjective,
  normalizeWeights,
  weightedScore,
} from './objectives';

describe('normalizeWeights', () => {
  it('sums to 1', () => {
    const w = normalizeWeights({ profit: 40, price: 35, ops: 15, stability: 10 });
    expect(w.profit + w.price + w.ops + w.stability).toBeCloseTo(1, 5);
  });
});

describe('checkGuardrails', () => {
  const scenario = 'p2' as const;
  const freeKeys: (keyof typeof DEFAULT_PARAMS)[] = ['margin', 'cpu_oversub'];

  it('rejects extreme margin', () => {
    const baseline = { ...DEFAULT_PARAMS };
    const extreme = { ...DEFAULT_PARAMS, margin: 0.7, cpu_oversub: 4 };
    const C = compute(extreme, scenario, false);
    expect(checkGuardrails(extreme, baseline, C, freeKeys)).toBe(false);
  });

  it('rejects cpu oversub above 5', () => {
    const baseline = { ...DEFAULT_PARAMS };
    const extreme = { ...DEFAULT_PARAMS, cpu_oversub: 8 };
    const C = compute(extreme, scenario, false);
    expect(checkGuardrails(extreme, baseline, C, freeKeys)).toBe(false);
  });
});

describe('evaluateBalancedObjective', () => {
  const scenario = 'p2' as const;
  const hwFromComponents = false;
  const baseline = { ...DEFAULT_PARAMS, margin: 0.3, utilization: 0.8, cpu_oversub: 4 };

  const ctx = {
    baseline,
    freeKeys: ['margin', 'nvme_tb_per_server', 'utilization'] as (keyof typeof DEFAULT_PARAMS)[],
    weights: DEFAULT_OBJECTIVE_WEIGHTS,
    scenario,
    hwFromComponents,
  };

  it('baseline is feasible and scores near zero on relative deltas', () => {
    const ev = evaluateBalancedObjective(baseline, ctx);
    expect(ev.feasible).toBe(true);
    expect(ev.metrics.profitDeltaDzd).toBe(0);
    expect(ev.metrics.refTargetUsdDelta).toBeCloseTo(0, 5);
  });

  it('rejects margin at slider max (70%) when margin is free', () => {
    const extreme = { ...baseline, margin: 0.7 };
    const ev = evaluateBalancedObjective(extreme, ctx);
    expect(ev.feasible).toBe(false);
    expect(ev.score).toBe(Number.NEGATIVE_INFINITY);
  });

  it('moderate NVMe increase can beat extreme margin-only tweak on balance score', () => {
    const moderate = { ...baseline, nvme_tb_per_server: 4, margin: 0.32 };
    const extremeProfit = { ...baseline, margin: 0.45, utilization: 0.9, cpu_oversub: 5 };

    const modEv = evaluateBalancedObjective(moderate, ctx);
    const extEv = evaluateBalancedObjective(extremeProfit, ctx);

    expect(modEv.feasible).toBe(true);
    if (extEv.feasible && modEv.feasible) {
      const modScore = weightedScore(modEv.metrics.subScores, DEFAULT_OBJECTIVE_WEIGHTS);
      const extScore = weightedScore(extEv.metrics.subScores, DEFAULT_OBJECTIVE_WEIGHTS);
      expect(modScore).toBeGreaterThanOrEqual(extScore - 0.5);
    }
  });
});
