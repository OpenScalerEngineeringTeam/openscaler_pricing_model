import { getControlGroups } from './controlGroups';
import type { ControlField, ModelParams, Scenario } from '../types';

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

export function getSearchableParamKeys(
  scenario: Scenario,
  hwFromComponents = false,
): (keyof ModelParams)[] {
  return getVisibleControlFields(scenario, hwFromComponents).map((f) => f.key);
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
