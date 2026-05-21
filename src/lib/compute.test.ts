import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import { fleetMonthlyProfitDzd } from './fleetProfit';

function provisionedStorageDzd(P: typeof DEFAULT_PARAMS, payingVms: number): number {
  const physicalGb = P.nvme_tb_per_server * 1024;
  const provisionedGb = Math.min(payingVms * P.avg_vm_disk_gb, physicalGb);
  return provisionedGb * P.disk_dzd_per_gb_mo;
}

describe('monthly_storage', () => {
  it('bills provisioned GiB at paying VMs, capped by physical NVMe', () => {
    const P = DEFAULT_PARAMS;
    const C = compute(P, 'p2');
    expect(C.monthly_storage).toBeCloseTo(provisionedStorageDzd(P, C.paying_vms), 6);
  });

  it('does not rise when extra NVMe does not add slots (non-disk binding)', () => {
    const P = { ...DEFAULT_PARAMS, cpu_oversub: 6, avg_vm_disk_gb: 40 };
    const base = compute({ ...P, nvme_tb_per_server: 4 }, 'p2');
    const moreNvme = compute({ ...P, nvme_tb_per_server: 32 }, 'p2');

    expect(base.binding).not.toBe('Disk');
    expect(moreNvme.sellable_vms).toBe(base.sellable_vms);
    expect(moreNvme.paying_vms).toBe(base.paying_vms);
    expect(moreNvme.monthly_storage).toBeCloseTo(base.monthly_storage, 6);
    expect(fleetMonthlyProfitDzd(P, moreNvme)).toBeCloseTo(
      fleetMonthlyProfitDzd(P, base),
      6,
    );
  });

  it('rises when disk binding allows more paying VMs', () => {
    const P = {
      ...DEFAULT_PARAMS,
      ram_gb: 512,
      cpu_cores: 96,
      cpu_oversub: 10,
      ram_oversub: 2,
      avg_vm_ram: 8,
      avg_vm_vcpu: 4,
      avg_vm_disk_gb: 100,
      nvme_tb_per_server: 2,
    };
    const tight = compute(P, 'p2');
    const roomy = compute({ ...P, nvme_tb_per_server: 8 }, 'p2');

    expect(tight.binding).toBe('Disk');
    expect(roomy.sellable_vms).toBeGreaterThan(tight.sellable_vms);
    expect(roomy.monthly_storage).toBeGreaterThan(tight.monthly_storage);
  });
});

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
