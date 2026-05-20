import type { ComputeResult, ModelParams } from '../types';

/** Gross profit at target margin if every paying slot sells at min_price_vm. */
export function fleetMonthlyProfitDzd(P: ModelParams, C: ComputeResult): number {
  if (P.margin <= 0 || C.paying_vms <= 0) return 0;
  const profitPerPayingVm = C.min_price_vm - C.cost_per_paying_vm;
  return P.num_servers * C.paying_vms * profitPerPayingVm;
}
