import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';

describe('ram_oversub', () => {
  it('increases sellable slots and lowers cost per VM when raised', () => {
    const P = { ...DEFAULT_PARAMS, avg_vm_ram: 8, ram_oversub: 1 };
    const base = compute(P, 'p2');
    const high = compute({ ...P, ram_oversub: 1.4 }, 'p2');

    expect(high.sellable_by_ram).toBeGreaterThan(base.sellable_by_ram);
    expect(high.sellable_vms).toBeGreaterThan(base.sellable_vms);
    expect(high.cost_per_paying_vm).toBeLessThan(base.cost_per_paying_vm);
  });
});
