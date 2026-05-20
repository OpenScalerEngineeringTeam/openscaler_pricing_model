import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import { fleetMonthlyProfitDzd } from './fleetProfit';

describe('fleetMonthlyProfitDzd', () => {
  const P = DEFAULT_PARAMS;
  const C = compute(P, 'p2');

  it('is profit per paying VM × fleet paying slots', () => {
    const profitPerVm = C.min_price_vm - C.cost_per_paying_vm;
    expect(fleetMonthlyProfitDzd(P, C)).toBeCloseTo(P.num_servers * C.paying_vms * profitPerVm, 6);
  });

  it('matches cost × margin / (1 − margin) per paying VM', () => {
    const perVm = (C.cost_per_paying_vm * P.margin) / (1 - P.margin);
    expect(fleetMonthlyProfitDzd(P, C)).toBeCloseTo(P.num_servers * C.paying_vms * perVm, 6);
  });

  it('scales with fleet size and margin', () => {
    const base = fleetMonthlyProfitDzd(P, C);
    const biggerFleet = fleetMonthlyProfitDzd({ ...P, num_servers: P.num_servers * 2 }, C);
    const higherMarginP = { ...P, margin: P.margin + 0.15 };
    const higherMargin = fleetMonthlyProfitDzd(higherMarginP, compute(higherMarginP, 'p2'));
    expect(biggerFleet).toBeCloseTo(base * 2, 6);
    expect(higherMargin).toBeGreaterThan(base);
  });

  it('is zero when margin is zero', () => {
    const noMargin = { ...P, margin: 0 };
    expect(fleetMonthlyProfitDzd(noMargin, compute(noMargin, 'p2'))).toBe(0);
  });

  it('is zero when there are no paying VMs', () => {
    const empty = { ...P, utilization: 0 };
    expect(fleetMonthlyProfitDzd(empty, compute(empty, 'p2'))).toBe(0);
  });
});
