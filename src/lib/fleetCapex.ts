import type { ComputeResult, ModelParams } from '../types';
import { fleetMonthlyProfitDzd } from './fleetProfit';

export function fleetCapexDzd(P: ModelParams, C: ComputeResult): number {
  return C.hw_landed_dzd * P.num_servers;
}

export function fleetPayingSlots(P: ModelParams, C: ComputeResult): number {
  return P.num_servers * C.paying_vms;
}

export function capexPerPayingSlotDzd(P: ModelParams, C: ComputeResult): number | null {
  const slots = fleetPayingSlots(P, C);
  if (slots <= 0) return null;
  return fleetCapexDzd(P, C) / slots;
}

/** Months to recover fleet hardware CAPEX from modeled gross profit at target margin (steady state). */
export function hardwarePaybackMonths(P: ModelParams, C: ComputeResult): number | null {
  const profit = fleetMonthlyProfitDzd(P, C);
  if (profit <= 0) return null;
  return fleetCapexDzd(P, C) / profit;
}
