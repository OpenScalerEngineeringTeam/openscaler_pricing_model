import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import {
  capexPerPayingSlotDzd,
  fleetCapexDzd,
  fleetPayingSlots,
  hardwarePaybackMonths,
} from './fleetCapex';
import { fleetMonthlyProfitDzd } from './fleetProfit';

describe('fleetCapex', () => {
  const P = DEFAULT_PARAMS;
  const C = compute(P, 'p2');

  it('fleet CAPEX is landed hardware × server count', () => {
    expect(fleetCapexDzd(P, C)).toBeCloseTo(C.hw_landed_dzd * P.num_servers, 6);
  });

  it('CAPEX per paying slot divides fleet CAPEX by paying slots', () => {
    const slots = fleetPayingSlots(P, C);
    expect(capexPerPayingSlotDzd(P, C)).toBeCloseTo(fleetCapexDzd(P, C) / slots, 6);
  });

  it('payback months is CAPEX / fleet profit', () => {
    const profit = fleetMonthlyProfitDzd(P, C);
    expect(hardwarePaybackMonths(P, C)).toBeCloseTo(fleetCapexDzd(P, C) / profit, 6);
  });

  it('returns null payback and per-slot when there are no paying VMs', () => {
    const empty = { ...P, utilization: 0 };
    const emptyC = compute(empty, 'p2');
    expect(capexPerPayingSlotDzd(empty, emptyC)).toBeNull();
    expect(hardwarePaybackMonths(empty, emptyC)).toBeNull();
  });

  it('returns null payback when margin is zero', () => {
    const noMargin = { ...P, margin: 0 };
    const noMarginC = compute(noMargin, 'p2');
    expect(hardwarePaybackMonths(noMargin, noMarginC)).toBeNull();
  });
});
