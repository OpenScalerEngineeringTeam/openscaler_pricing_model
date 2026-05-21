import { compute } from './compute';
import { fleetMonthlyProfitDzd } from './fleetProfit';
import { getParamBounds } from './paramBounds';
import { planBreakEvenDzd } from './pricing';
import type { ComputeResult, ModelParams, Scenario } from '../types';

export interface ObjectiveWeights {
  profit: number;
  price: number;
  ops: number;
  stability: number;
}

/** Balanced profile: 40% profit, 35% price, 15% ops, 10% stability */
export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  profit: 0.4,
  price: 0.35,
  ops: 0.15,
  stability: 0.1,
};

export const OBJECTIVE_WEIGHT_LABELS: Record<keyof ObjectiveWeights, string> = {
  profit: 'Profit',
  price: 'Competitive pricing',
  ops: 'Ops quality',
  stability: 'Config stability',
};

export interface ObjectiveSubScores {
  profitNorm: number;
  priceNorm: number;
  opsNorm: number;
  stabilityNorm: number;
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
  profitDeltaDzd: number;
  refTargetUsdDelta: number;
  subScores: ObjectiveSubScores;
}

export interface ObjectiveEvaluation {
  score: number;
  feasible: boolean;
  metrics: ObjectiveMetrics;
  params: ModelParams;
  computed: ComputeResult;
}

export interface BalancedEvaluateContext {
  baseline: ModelParams;
  freeKeys: (keyof ModelParams)[];
  weights: ObjectiveWeights;
  scenario: Scenario;
  hwFromComponents: boolean;
}

const GUARD_CPU_OVERSUB_MAX = 5;
const GUARD_RAM_OVERSUB_MAX = 1.35;
const GUARD_UTIL_MAX = 0.9;
const GUARD_MARGIN_MIN = 0.15;
const GUARD_MARGIN_MAX = 0.45;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function refPlan(P: ModelParams) {
  return {
    memory: P.avg_vm_ram,
    vcpus: P.avg_vm_vcpu,
    disk: P.avg_vm_disk_gb,
    transfer: P.avg_vm_transfer_tb,
  };
}

function refTargetUsd(P: ModelParams, C: ComputeResult): number {
  const refBeDzd = planBreakEvenDzd(refPlan(P), P, C);
  return refBeDzd / (1 - P.margin) / P.usd_dzd;
}

function buildBaseMetrics(P: ModelParams, C: ComputeResult): Omit<ObjectiveMetrics, 'profitDeltaDzd' | 'refTargetUsdDelta' | 'subScores'> {
  const refBeDzd = planBreakEvenDzd(refPlan(P), P, C);
  const refTarget = refTargetUsd(P, C);
  return {
    fleetProfitDzd: fleetMonthlyProfitDzd(P, C),
    costPerPayingVm: C.cost_per_paying_vm,
    refTargetUsd: refTarget,
    refBreakEvenUsd: refBeDzd / P.usd_dzd,
    sellableVms: C.sellable_vms,
    payingVms: C.paying_vms,
    binding: C.binding,
    marginPct: P.margin,
  };
}

function isFree(freeKeys: (keyof ModelParams)[], key: keyof ModelParams): boolean {
  return freeKeys.includes(key);
}

/** Hard guardrails for serious planning — always on. */
export function checkGuardrails(
  candidate: ModelParams,
  baseline: ModelParams,
  C: ComputeResult,
  freeKeys: (keyof ModelParams)[],
): boolean {
  if (C.paying_vms <= 0) return false;
  if (candidate.cpu_oversub > GUARD_CPU_OVERSUB_MAX) return false;
  if (candidate.ram_oversub > GUARD_RAM_OVERSUB_MAX) return false;
  if (isFree(freeKeys, 'utilization') && candidate.utilization > GUARD_UTIL_MAX) return false;
  if (isFree(freeKeys, 'margin')) {
    if (candidate.margin < GUARD_MARGIN_MIN || candidate.margin > GUARD_MARGIN_MAX) return false;
  }
  if (isFree(freeKeys, 'salary_dzd') && candidate.salary_dzd < baseline.salary_dzd) return false;
  if (isFree(freeKeys, 'team_people') && candidate.team_people < baseline.team_people) return false;
  return true;
}

function softPenalty(value: number, limit: number): number {
  const start = limit * 0.85;
  if (value <= start) return 0;
  return clamp((value - start) / (limit - start), 0, 1);
}

function opsFactor(candidate: ModelParams, baseline: ModelParams, freeKeys: (keyof ModelParams)[]): number {
  const salaryFactor = isFree(freeKeys, 'salary_dzd')
    ? Math.min(1, candidate.salary_dzd / Math.max(baseline.salary_dzd, 1))
    : 1;
  const teamFactor = isFree(freeKeys, 'team_people')
    ? Math.min(1, candidate.team_people / Math.max(baseline.team_people, 1))
    : 1;
  const oversubFactor =
    1 -
    softPenalty(candidate.cpu_oversub, GUARD_CPU_OVERSUB_MAX) -
    softPenalty(candidate.ram_oversub, GUARD_RAM_OVERSUB_MAX);
  const util = candidate.utilization;
  const utilFactor = util <= 0.85 ? 1 : util >= 0.95 ? 0 : 1 - (util - 0.85) / 0.1;
  return clamp(salaryFactor * teamFactor * oversubFactor * utilFactor, 0, 1);
}

function stabilityNorm(
  candidate: ModelParams,
  baseline: ModelParams,
  freeKeys: (keyof ModelParams)[],
  scenario: Scenario,
  hwFromComponents: boolean,
): number {
  const bounds = getParamBounds(scenario, hwFromComponents);
  const squares: number[] = [];
  for (const key of freeKeys) {
    const bound = bounds[key];
    if (!bound) continue;
    const span = bound.max - bound.min;
    if (span <= 0) continue;
    const rel = (candidate[key] - baseline[key]) / span;
    squares.push(rel * rel);
  }
  if (squares.length === 0) return 0;
  const meanSq = squares.reduce((a, b) => a + b, 0) / squares.length;
  return clamp(1 - meanSq * 4, -1, 1);
}

function computeSubScores(
  candidate: ModelParams,
  baseline: ModelParams,
  candidateC: ComputeResult,
  baselineC: ComputeResult,
  freeKeys: (keyof ModelParams)[],
  scenario: Scenario,
  hwFromComponents: boolean,
): ObjectiveSubScores {
  const baselineProfit = fleetMonthlyProfitDzd(baseline, baselineC);
  const candidateProfit = fleetMonthlyProfitDzd(candidate, candidateC);
  const profitNorm = clamp(
    (candidateProfit - baselineProfit) / Math.max(Math.abs(baselineProfit), 1),
    -1,
    1,
  );

  const baselineRef = refTargetUsd(baseline, baselineC);
  const candidateRef = refTargetUsd(candidate, candidateC);
  const priceNorm = clamp(
    (baselineRef - candidateRef) / Math.max(baselineRef, 0.01),
    -1,
    1,
  );

  const ops = opsFactor(candidate, baseline, freeKeys);
  const opsNorm = 2 * ops - 1;

  const stability = stabilityNorm(candidate, baseline, freeKeys, scenario, hwFromComponents);

  return { profitNorm, priceNorm, opsNorm, stabilityNorm: stability };
}

export function normalizeWeights(w: ObjectiveWeights): ObjectiveWeights {
  const sum = w.profit + w.price + w.ops + w.stability;
  if (sum <= 0) return { ...DEFAULT_OBJECTIVE_WEIGHTS };
  return {
    profit: w.profit / sum,
    price: w.price / sum,
    ops: w.ops / sum,
    stability: w.stability / sum,
  };
}

export function weightedScore(sub: ObjectiveSubScores, weights: ObjectiveWeights): number {
  const w = normalizeWeights(weights);
  return (
    w.profit * sub.profitNorm +
    w.price * sub.priceNorm +
    w.ops * sub.opsNorm +
    w.stability * sub.stabilityNorm
  );
}

export function evaluateBalancedObjective(
  params: ModelParams,
  ctx: BalancedEvaluateContext,
): ObjectiveEvaluation {
  const { baseline, freeKeys, weights, scenario, hwFromComponents } = ctx;
  const baselineC = compute(baseline, scenario, hwFromComponents);
  const C = compute(params, scenario, hwFromComponents);
  const base = buildBaseMetrics(params, C);
  const baselineProfit = fleetMonthlyProfitDzd(baseline, baselineC);
  const baselineRef = refTargetUsd(baseline, baselineC);

  const subScores = computeSubScores(params, baseline, C, baselineC, freeKeys, scenario, hwFromComponents);
  const feasible = checkGuardrails(params, baseline, C, freeKeys);
  const score = feasible ? weightedScore(subScores, weights) : Number.NEGATIVE_INFINITY;

  return {
    score,
    feasible,
    metrics: {
      ...base,
      profitDeltaDzd: base.fleetProfitDzd - baselineProfit,
      refTargetUsdDelta: base.refTargetUsd - baselineRef,
      subScores,
    },
    params,
    computed: C,
  };
}

/** Evaluate baseline for display / search comparison. */
export function evaluateBaseline(ctx: BalancedEvaluateContext): ObjectiveEvaluation {
  return evaluateBalancedObjective(ctx.baseline, ctx);
}
