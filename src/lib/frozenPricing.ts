import { compute } from './compute';
import { planBreakEvenDzd } from './pricing';
import type { ComputeResult, ModelParams, Plan, Scenario } from '../types';

export function computeAtUtilization(
  params: ModelParams,
  utilization: number,
  scenario: Scenario,
  hwFromComponents = false,
): ComputeResult {
  return compute({ ...params, utilization }, scenario, hwFromComponents);
}

export function frozenPlanTargetDzd(
  plan: Pick<Plan, 'memory' | 'vcpus' | 'disk' | 'transfer'>,
  params: ModelParams,
  anchor: ComputeResult,
): number {
  const be = planBreakEvenDzd(plan, params, anchor);
  if (params.margin >= 1) return be;
  return be / (1 - params.margin);
}

/** Gross margin at current costs if retail stays at the frozen target price. */
export function effectiveGrossMargin(frozenTargetDzd: number, currentBreakEvenDzd: number): number | null {
  if (frozenTargetDzd <= 0) return null;
  return 1 - currentBreakEvenDzd / frozenTargetDzd;
}

/** Fleet profit when every paying slot bills at anchor min_price_vm but costs are at current utilization. */
export function fleetMonthlyProfitFrozen(
  params: ModelParams,
  current: ComputeResult,
  anchor: ComputeResult,
): number {
  if (params.margin <= 0 || current.paying_vms <= 0) return 0;
  const profitPerVm = anchor.min_price_vm - current.cost_per_paying_vm;
  return params.num_servers * current.paying_vms * profitPerVm;
}
