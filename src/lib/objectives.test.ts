import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import { evaluateObjective } from './objectives';

describe('evaluateObjective', () => {
  const scenario = 'p2' as const;
  const hwFromComponents = false;

  it('maxFleetProfit prefers higher margin when utilization is fixed', () => {
    const low = evaluateObjective(
      { ...DEFAULT_PARAMS, margin: 0.15 },
      'maxFleetProfit',
      {},
      scenario,
      hwFromComponents,
    );
    const high = evaluateObjective(
      { ...DEFAULT_PARAMS, margin: 0.55 },
      'maxFleetProfit',
      {},
      scenario,
      hwFromComponents,
    );
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('minRefTargetPrice rejects candidates below profit floor', () => {
    const P = { ...DEFAULT_PARAMS, margin: 0.5 };
    const C = compute(P, scenario, hwFromComponents);
    const ev = evaluateObjective(P, 'minRefTargetPrice', { profitFloorDzd: C.total * 1000 }, scenario, hwFromComponents);
    expect(ev.feasible).toBe(ev.metrics.fleetProfitDzd >= C.total * 1000);
  });

  it('maxFleetProfitUnderPriceCap rejects high ref target', () => {
    const ev = evaluateObjective(
      DEFAULT_PARAMS,
      'maxFleetProfitUnderPriceCap',
      { refTargetUsdCap: 1 },
      scenario,
      hwFromComponents,
    );
    expect(ev.feasible).toBe(ev.metrics.refTargetUsd <= 1);
  });

  it('minCostPerPayingVm scores lower cost higher', () => {
    const expensive = evaluateObjective(
      { ...DEFAULT_PARAMS, utilization: 0.35 },
      'minCostPerPayingVm',
      {},
      scenario,
      hwFromComponents,
    );
    const cheaper = evaluateObjective(
      { ...DEFAULT_PARAMS, utilization: 0.9, nvme_tb_per_server: 8 },
      'minCostPerPayingVm',
      {},
      scenario,
      hwFromComponents,
    );
    if (expensive.feasible && cheaper.feasible) {
      expect(cheaper.score).toBeGreaterThan(expensive.score);
    }
  });
});
