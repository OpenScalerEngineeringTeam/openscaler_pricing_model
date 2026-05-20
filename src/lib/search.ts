import {
  applyFreeParams,
  enumerateSteps,
  getParamBounds,
  snapParam,
  type ParamBound,
} from './paramBounds';
import { evaluateObjective, type ObjectiveConstraints, type ObjectiveEvaluation, type ObjectiveId } from './objectives';
import type { ModelParams, Scenario } from '../types';

export interface SearchOptions {
  baseline: ModelParams;
  freeKeys: (keyof ModelParams)[];
  objectiveId: ObjectiveId;
  constraints: ObjectiveConstraints;
  scenario: Scenario;
  hwFromComponents: boolean;
  samples?: number;
  seed?: number;
  topK?: number;
  refinePasses?: number;
}

export interface SearchResult {
  baselineScore: number;
  baselineFeasible: boolean;
  top: ObjectiveEvaluation[];
  evaluated: number;
  improved: boolean;
}

/** Mulberry32 — deterministic PRNG from seed. */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mergeCandidate(
  baseline: ModelParams,
  freeKeys: (keyof ModelParams)[],
  overrides: Partial<ModelParams>,
): ModelParams {
  const next = { ...baseline };
  for (const key of freeKeys) {
    if (overrides[key] !== undefined) next[key] = overrides[key] as number;
  }
  return next;
}

function coordinateRefine(
  start: ModelParams,
  freeKeys: (keyof ModelParams)[],
  bounds: Partial<Record<keyof ModelParams, ParamBound>>,
  objectiveId: ObjectiveId,
  constraints: ObjectiveConstraints,
  scenario: Scenario,
  hwFromComponents: boolean,
  passes: number,
): ObjectiveEvaluation {
  let best = evaluateObjective(start, objectiveId, constraints, scenario, hwFromComponents);

  for (let pass = 0; pass < passes; pass++) {
    let improved = false;
    for (const key of freeKeys) {
      const bound = bounds[key];
      if (!bound) continue;
      const steps = enumerateSteps(bound);
      const idx = steps.findIndex((v) => Math.abs(v - best.params[key]) < bound.step / 2);
      const tryOrder: number[] = [];
      if (idx >= 0) {
        for (let d = 1; d < steps.length; d++) {
          if (idx - d >= 0) tryOrder.push(steps[idx - d]);
          if (idx + d < steps.length) tryOrder.push(steps[idx + d]);
        }
      } else {
        tryOrder.push(...steps);
      }

      for (const value of tryOrder) {
        const candidate = mergeCandidate(best.params, freeKeys, { [key]: snapParam(value, bound) });
        const ev = evaluateObjective(candidate, objectiveId, constraints, scenario, hwFromComponents);
        if (ev.feasible && ev.score > best.score) {
          best = ev;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return best;
}

function insertTop(top: ObjectiveEvaluation[], ev: ObjectiveEvaluation, k: number): void {
  if (!ev.feasible) return;
  const key = JSON.stringify(ev.params);
  if (top.some((t) => JSON.stringify(t.params) === key)) return;
  top.push(ev);
  top.sort((a, b) => b.score - a.score);
  if (top.length > k) top.length = k;
}

export function runSearch(options: SearchOptions): SearchResult {
  const {
    baseline,
    freeKeys,
    objectiveId,
    constraints,
    scenario,
    hwFromComponents,
    samples = 1000,
    seed = 42,
    topK = 10,
    refinePasses = 2,
  } = options;

  const bounds = getParamBounds(scenario, hwFromComponents);
  const rng = createRng(seed);
  const baselineEv = evaluateObjective(baseline, objectiveId, constraints, scenario, hwFromComponents);

  if (freeKeys.length === 0) {
    return {
      baselineScore: baselineEv.score,
      baselineFeasible: baselineEv.feasible,
      top: baselineEv.feasible ? [baselineEv] : [],
      evaluated: 1,
      improved: false,
    };
  }

  const top: ObjectiveEvaluation[] = [];
  if (baselineEv.feasible) insertTop(top, baselineEv, topK);

  let best = baselineEv;

  for (let i = 0; i < samples; i++) {
    const candidate = applyFreeParams(baseline, freeKeys, bounds, rng);
    const ev = evaluateObjective(candidate, objectiveId, constraints, scenario, hwFromComponents);
    insertTop(top, ev, topK);
    if (ev.feasible && ev.score > best.score) best = ev;
  }

  if (best.feasible) {
    const refined = coordinateRefine(
      best.params,
      freeKeys,
      bounds,
      objectiveId,
      constraints,
      scenario,
      hwFromComponents,
      refinePasses,
    );
    insertTop(top, refined, topK);
    if (refined.feasible && refined.score > best.score) best = refined;
  }

  top.sort((a, b) => b.score - a.score);

  return {
    baselineScore: baselineEv.score,
    baselineFeasible: baselineEv.feasible,
    top,
    evaluated: samples + 1 + freeKeys.length * refinePasses,
    improved: best.feasible && best.score > baselineEv.score,
  };
}

/** Brute-force all combos for tiny grids (tests). */
export function bruteForceSearch(
  options: Omit<SearchOptions, 'samples' | 'seed' | 'refinePasses'>,
): SearchResult {
  const { baseline, freeKeys, objectiveId, constraints, scenario, hwFromComponents, topK = 10 } = options;
  const bounds = getParamBounds(scenario, hwFromComponents);
  const baselineEv = evaluateObjective(baseline, objectiveId, constraints, scenario, hwFromComponents);

  const grids = freeKeys.map((key) => {
    const bound = bounds[key];
    return bound ? enumerateSteps(bound) : [baseline[key]];
  });

  const top: ObjectiveEvaluation[] = [];
  let best = baselineEv;
  let evaluated = 0;

  function recurse(depth: number, overrides: Partial<ModelParams>) {
    if (depth === freeKeys.length) {
      evaluated++;
      const params = mergeCandidate(baseline, freeKeys, overrides);
      const ev = evaluateObjective(params, objectiveId, constraints, scenario, hwFromComponents);
      insertTop(top, ev, topK);
      if (ev.feasible && ev.score > best.score) best = ev;
      return;
    }
    const key = freeKeys[depth];
    for (const value of grids[depth]) {
      recurse(depth + 1, { ...overrides, [key]: value });
    }
  }

  recurse(0, {});
  top.sort((a, b) => b.score - a.score);

  return {
    baselineScore: baselineEv.score,
    baselineFeasible: baselineEv.feasible,
    top,
    evaluated,
    improved: best.feasible && best.score > baselineEv.score,
  };
}
