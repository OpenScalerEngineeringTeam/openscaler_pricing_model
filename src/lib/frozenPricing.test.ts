import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import {
  computeAtUtilization,
  effectiveGrossMargin,
  fleetMonthlyProfitFrozen,
  frozenPlanTargetDzd,
} from './frozenPricing';
import { planBreakEvenDzd } from './pricing';

describe('frozen pricing', () => {
  const P = DEFAULT_PARAMS;

  it('anchor cost per VM rises when launch utilization is lower than steady state', () => {
    const launch = computeAtUtilization(P, 0.4, 'p2');
    const steady = computeAtUtilization(P, 0.8, 'p2');
    expect(launch.cost_per_paying_vm).toBeGreaterThan(steady.cost_per_paying_vm);
    expect(frozenPlanTargetDzd(
      { memory: P.avg_vm_ram, vcpus: P.avg_vm_vcpu, disk: P.avg_vm_disk_gb, transfer: P.avg_vm_transfer_tb },
      P,
      launch,
    )).toBeGreaterThan(
      frozenPlanTargetDzd(
        { memory: P.avg_vm_ram, vcpus: P.avg_vm_vcpu, disk: P.avg_vm_disk_gb, transfer: P.avg_vm_transfer_tb },
        P,
        steady,
      ),
    );
  });

  it('effective margin exceeds target when util grows but prices stay at launch anchor', () => {
    const launchUtil = 0.4;
    const steadyUtil = 0.8;
    const anchor = computeAtUtilization(P, launchUtil, 'p2');
    const current = computeAtUtilization(P, steadyUtil, 'p2');
    const ref = { memory: P.avg_vm_ram, vcpus: P.avg_vm_vcpu, disk: P.avg_vm_disk_gb, transfer: P.avg_vm_transfer_tb };
    const frozen = frozenPlanTargetDzd(ref, P, anchor);
    const beNow = planBreakEvenDzd(ref, P, current);
    const eff = effectiveGrossMargin(frozen, beNow);
    expect(eff).not.toBeNull();
    expect(eff!).toBeGreaterThan(P.margin);
  });

  it('frozen fleet profit uses current paying slots and anchor min price', () => {
    const anchor = computeAtUtilization({ ...P, utilization: 0.4 }, 0.4, 'p2');
    const current = compute({ ...P, utilization: 0.8 }, 'p2');
    const perVm = anchor.min_price_vm - current.cost_per_paying_vm;
    expect(fleetMonthlyProfitFrozen(P, current, anchor)).toBeCloseTo(
      P.num_servers * current.paying_vms * perVm,
      6,
    );
  });
});
