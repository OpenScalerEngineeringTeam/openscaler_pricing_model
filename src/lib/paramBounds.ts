import { getControlGroups } from './controlGroups';
import type { ControlField, ModelParams, Scenario } from '../types';

/** Held at model values during search — market / regulator / carrier inputs, not fleet design knobs. */
export const OPTIMIZER_EXCLUDED_KEYS: readonly (keyof ModelParams)[] = [
  'usd_dzd',
  'customs_pct',
  'power_dzd_kwh',
  'rack_per_u_dzd',
  'bw_dzd_mbps',
] as const;

/**
 * Shown in the pin matrix but fixed on first open — business assumptions, reference VM mix,
 * physical host spec, and wholesale BOM unit prices (not day-to-day fleet tuning knobs).
 */
export const OPTIMIZER_DEFAULT_PINNED_KEYS: readonly (keyof ModelParams)[] = [
  'amort_months',
  'bw_mbps',
  'num_servers',
  'team_people',
  'salary_dzd',
  'avg_vm_ram',
  'avg_vm_vcpu',
  'avg_vm_disk_gb',
  'avg_vm_transfer_tb',
  'disk_dzd_per_gb_mo',
  'transfer_dzd_per_tb_mo',
  'cpu_cores',
  'ram_gb',
  'server_w',
  'pue',
  'cpu_sockets',
  'hw_usd_per_cpu_socket',
  'hw_usd_per_gib_ram',
  'hw_usd_per_tb_nvme',
  'hw_usd_motherboard',
  'hw_usd_chassis_misc',
] as const;

export interface ParamBound {
  min: number;
  max: number;
  step: number;
}

export function getVisibleControlFields(
  scenario: Scenario,
  hwFromComponents = false,
): ControlField[] {
  return getControlGroups(scenario, { hwFromComponents })
    .filter((g) => !g.show || g.show())
    .flatMap((g) => g.fields);
}

/** Bounds for every parameter that appears in the current UI (visible control fields). */
export function getParamBounds(
  scenario: Scenario,
  hwFromComponents = false,
): Partial<Record<keyof ModelParams, ParamBound>> {
  const bounds: Partial<Record<keyof ModelParams, ParamBound>> = {};
  for (const field of getVisibleControlFields(scenario, hwFromComponents)) {
    bounds[field.key] = { min: field.min, max: field.max, step: field.step };
  }
  return bounds;
}

export function getOptimizerControlFields(
  scenario: Scenario,
  hwFromComponents = false,
): ControlField[] {
  const excluded = new Set<keyof ModelParams>(OPTIMIZER_EXCLUDED_KEYS);
  return getVisibleControlFields(scenario, hwFromComponents).filter((f) => !excluded.has(f.key));
}

export function getSearchableParamKeys(
  scenario: Scenario,
  hwFromComponents = false,
): (keyof ModelParams)[] {
  return getOptimizerControlFields(scenario, hwFromComponents).map((f) => f.key);
}

/** Default pins: business / market assumptions fixed; oversub, NVMe, utilization, margin, hw_usd free. */
export function defaultOptimizerPins(
  scenario: Scenario,
  hwFromComponents = false,
): Partial<Record<keyof ModelParams, boolean>> {
  const pinned = new Set<keyof ModelParams>(OPTIMIZER_DEFAULT_PINNED_KEYS);
  const pins: Partial<Record<keyof ModelParams, boolean>> = {};
  for (const f of getOptimizerControlFields(scenario, hwFromComponents)) {
    pins[f.key] = pinned.has(f.key);
  }
  return pins;
}

export function snapParam(value: number, bound: ParamBound): number {
  const clamped = Math.min(bound.max, Math.max(bound.min, value));
  const steps = Math.round((clamped - bound.min) / bound.step);
  const snapped = bound.min + steps * bound.step;
  const decimals = bound.step < 1 ? Math.max(0, -Math.floor(Math.log10(bound.step))) : 0;
  return decimals > 0 ? Math.round(snapped * 10 ** decimals) / 10 ** decimals : snapped;
}

export function enumerateSteps(bound: ParamBound): number[] {
  const out: number[] = [];
  const n = Math.round((bound.max - bound.min) / bound.step);
  for (let i = 0; i <= n; i++) {
    out.push(snapParam(bound.min + i * bound.step, bound));
  }
  return out;
}

export function randomParamInBounds(bound: ParamBound, rng: () => number): number {
  const steps = enumerateSteps(bound);
  return steps[Math.floor(rng() * steps.length)] ?? bound.min;
}

export function applyFreeParams(
  baseline: ModelParams,
  freeKeys: (keyof ModelParams)[],
  bounds: Partial<Record<keyof ModelParams, ParamBound>>,
  rng: () => number,
): ModelParams {
  const next = { ...baseline };
  for (const key of freeKeys) {
    const bound = bounds[key];
    if (bound) next[key] = randomParamInBounds(bound, rng) as ModelParams[typeof key];
  }
  return next;
}
