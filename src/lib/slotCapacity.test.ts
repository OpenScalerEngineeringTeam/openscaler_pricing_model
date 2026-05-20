import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, DEFAULT_PLANS } from './constants';
import {
  canonicalUnits,
  fitLabel,
  hostCapacitySummary,
  maxPerServer,
  planFit,
  unitsMismatch,
} from './slotCapacity';

describe('canonicalUnits', () => {
  it('ceil memory to whole GiB slots', () => {
    expect(canonicalUnits(0.5)).toBe(1);
    expect(canonicalUnits(1)).toBe(1);
    expect(canonicalUnits(32)).toBe(32);
  });
});

describe('maxPerServer', () => {
  const P = DEFAULT_PARAMS;

  it('limits large RAM plans by RAM on default host', () => {
    const big = DEFAULT_PLANS.find((p) => p.id === 'b-8-32-640')!;
    const max = maxPerServer(big, P);
    expect(max).toBeLessThanOrEqual(4);
    expect(planFit(max)).toMatch(/tight|risky/);
  });

  it('allows many small VMs per host', () => {
    const small = DEFAULT_PLANS.find((p) => p.id === 's-1vcpu-1gb')!;
    expect(maxPerServer(small, P)).toBeGreaterThanOrEqual(8);
    expect(planFit(maxPerServer(small, P))).toBe('ok');
  });
});

describe('planFit', () => {
  it('classifies host capacity bands', () => {
    expect(planFit(10)).toBe('ok');
    expect(planFit(6)).toBe('tight');
    expect(planFit(2)).toBe('risky');
    expect(planFit(0)).toBe('over');
  });
});

describe('fitLabel', () => {
  it('shows count per host except over', () => {
    expect(fitLabel('ok', 12)).toBe('12/host');
    expect(fitLabel('over', 0)).toBe('0/host');
  });
});

describe('hostCapacitySummary', () => {
  it('reports binding constraint for default host', () => {
    const s = hostCapacitySummary(DEFAULT_PARAMS);
    expect(s.sellableRamGiB).toBeCloseTo(128 / 1.2);
    expect(s.sellableVcpus).toBe(96);
    expect(s.sellableDiskGb).toBe(4096);
    expect(['RAM', 'CPU', 'Disk']).toContain(s.binding);
  });
});

describe('unitsMismatch', () => {
  it('flags catalog plans with non-canonical units', () => {
    const bad = DEFAULT_PLANS.find((p) => p.id === 'b-8-32-640')!;
    expect(unitsMismatch(bad)).toBe(true);
    const ok = DEFAULT_PLANS.find((p) => p.id === 'b-2-4-100')!;
    expect(unitsMismatch(ok)).toBe(false);
  });
});
