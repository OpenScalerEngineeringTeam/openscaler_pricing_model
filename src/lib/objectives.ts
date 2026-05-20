import { compute } from './compute';
import { fleetMonthlyProfitDzd } from './fleetProfit';
import { planBreakEvenDzd } from './pricing';
import type { ComputeResult, ModelParams, Scenario } from '../types';

export type ObjectiveId =
  | 'maxFleetProfit'
  | 'minRefTargetPrice'
  | 'maxFleetProfitUnderPriceCap'
  | 'minCostPerPayingVm';

export interface ObjectiveConstraints {
  profitFloorDzd?: number;
  refTargetUsdCap?: number;
  maxCpuOversub?: number;
  maxRamOversub?: number;
  minMargin?: number;
  maxMargin?: number;
}

export interface ObjectiveMetrics {
  fleetProfitDzd: number;
  costPerPayingVm: number;
  refTargetUsd: number;
  refBreakEvenUsd: number;
  sellableVms: number;
  payingVms: number;
  binding: string;
  marginPct: number;
}

export interface ObjectiveEvaluation {
  score: number;
  feasible: boolean;
  metrics: ObjectiveMetrics;
  params: ModelParams;
  computed: ComputeResult;
}

export const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  maxFleetProfit: 'Maximize fleet monthly profit',
  minRefTargetPrice: 'Minimize reference VM target price',
  maxFleetProfitUnderPriceCap: 'Maximize profit under reference price cap',
  minCostPerPayingVm: 'Minimize cost per paying VM',
};

function refPlan(P: ModelParams) {
  return {
    memory: P.avg_vm_ram,
    vcpus: P.avg_vm_vcpu,
    disk: P.avg_vm_disk_gb,
    transfer: P.avg_vm_transfer_tb,
  };
}

function buildMetrics(P: ModelParams, C: ComputeResult): ObjectiveMetrics {
  const refBeDzd = planBreakEvenDzd(refPlan(P), P, C);
  const refTargetDzd = refBeDzd / (1 - P.margin);
  return {
    fleetProfitDzd: fleetMonthlyProfitDzd(P, C),
    costPerPayingVm: C.cost_per_paying_vm,
    refTargetUsd: refTargetDzd / P.usd_dzd,
    refBreakEvenUsd: refBeDzd / P.usd_dzd,
    sellableVms: C.sellable_vms,
    payingVms: C.paying_vms,
    binding: C.binding,
    marginPct: P.margin,
  };
}

function checkSharedConstraints(
  P: ModelParams,
  C: ComputeResult,
  constraints: ObjectiveConstraints,
): boolean {
  if (C.paying_vms <= 0) return false;
  if (constraints.maxCpuOversub !== undefined && P.cpu_oversub > constraints.maxCpuOversub) return false;
  if (constraints.maxRamOversub !== undefined && P.ram_oversub > constraints.maxRamOversub) return false;
  if (constraints.minMargin !== undefined && P.margin < constraints.minMargin) return false;
  if (constraints.maxMargin !== undefined && P.margin > constraints.maxMargin) return false;
  return true;
}

export function evaluateObjective(
  params: ModelParams,
  objectiveId: ObjectiveId,
  constraints: ObjectiveConstraints,
  scenario: Scenario,
  hwFromComponents: boolean,
): ObjectiveEvaluation {
  const C = compute(params, scenario, hwFromComponents);
  const metrics = buildMetrics(params, C);
  const sharedOk = checkSharedConstraints(params, C, constraints);

  let feasible = sharedOk;
  let score = Number.NEGATIVE_INFINITY;

  if (!sharedOk) {
    return { score, feasible: false, metrics, params, computed: C };
  }

  switch (objectiveId) {
    case 'maxFleetProfit': {
      feasible = true;
      score = metrics.fleetProfitDzd;
      break;
    }
    case 'minRefTargetPrice': {
      const floor = constraints.profitFloorDzd ?? 0;
      feasible = metrics.fleetProfitDzd >= floor;
      score = feasible ? -metrics.refTargetUsd : Number.NEGATIVE_INFINITY;
      break;
    }
    case 'maxFleetProfitUnderPriceCap': {
      const cap = constraints.refTargetUsdCap ?? Infinity;
      feasible = metrics.refTargetUsd <= cap;
      score = feasible ? metrics.fleetProfitDzd : Number.NEGATIVE_INFINITY;
      break;
    }
    case 'minCostPerPayingVm': {
      const floor = constraints.profitFloorDzd;
      if (floor !== undefined && metrics.fleetProfitDzd < floor) {
        feasible = false;
        score = Number.NEGATIVE_INFINITY;
      } else {
        feasible = true;
        score = -metrics.costPerPayingVm;
      }
      break;
    }
  }

  return { score, feasible, metrics, params, computed: C };
}
