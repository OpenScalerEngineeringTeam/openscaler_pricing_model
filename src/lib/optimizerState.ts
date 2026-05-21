import { defaultOptimizerPins, getOptimizerControlFields } from './paramBounds';
import {
  DEFAULT_OBJECTIVE_WEIGHTS,
  normalizeWeights,
  type ObjectiveWeights,
} from './objectives';
import type { ModelParams, Scenario } from '../types';

export type PinState = Partial<Record<keyof ModelParams, boolean>>;

export interface OptimizerSessionState {
  pins: PinState;
  weights: ObjectiveWeights;
  samples: number;
  seed: number;
}

export const OPTIMIZER_SESSION_KEY = 'openscaler-optimizer-session';

export function mergeOptimizerPins(
  scenario: Scenario,
  hwFromComponents: boolean,
  existing?: PinState,
): PinState {
  const defaults = defaultOptimizerPins(scenario, hwFromComponents);
  if (!existing) return defaults;
  const next: PinState = {};
  for (const f of getOptimizerControlFields(scenario, hwFromComponents)) {
    next[f.key] = f.key in existing ? existing[f.key]! : defaults[f.key];
  }
  return next;
}

export function readOptimizerSession(): Partial<OptimizerSessionState> | null {
  try {
    const raw = sessionStorage.getItem(OPTIMIZER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<OptimizerSessionState>;
  } catch {
    return null;
  }
}

export function writeOptimizerSession(state: OptimizerSessionState): void {
  try {
    sessionStorage.setItem(OPTIMIZER_SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private browsing
  }
}

export function initialOptimizerSession(
  scenario: Scenario,
  hwFromComponents: boolean,
): OptimizerSessionState {
  const session = readOptimizerSession();
  return {
    pins: mergeOptimizerPins(scenario, hwFromComponents, session?.pins),
    weights: parseObjectiveWeights(session?.weights),
    samples: clampSamples(session?.samples),
    seed: typeof session?.seed === 'number' && !Number.isNaN(session.seed) ? session.seed : 42,
  };
}

export function parseObjectiveWeights(raw: unknown): ObjectiveWeights {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_OBJECTIVE_WEIGHTS };
  const o = raw as Record<string, unknown>;
  const w: ObjectiveWeights = {
    profit: readWeight(o.profit, DEFAULT_OBJECTIVE_WEIGHTS.profit),
    price: readWeight(o.price, DEFAULT_OBJECTIVE_WEIGHTS.price),
    ops: readWeight(o.ops, DEFAULT_OBJECTIVE_WEIGHTS.ops),
    stability: readWeight(o.stability, DEFAULT_OBJECTIVE_WEIGHTS.stability),
  };
  return normalizeWeights(w);
}

function readWeight(v: unknown, fallback: number): number {
  return typeof v === 'number' && !Number.isNaN(v) && v >= 0 ? v : fallback;
}

export function clampSamples(n: unknown): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 1000;
  return Math.max(100, Math.min(5000, Math.round(n)));
}

export function parseOptimizerPins(raw: unknown): PinState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const pins: PinState = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'boolean') pins[key as keyof ModelParams] = val;
  }
  return Object.keys(pins).length > 0 ? pins : undefined;
}

export interface OptimizerConfigSection {
  objective_weights: ObjectiveWeights;
  pins: PinState;
  samples: number;
  seed: number;
}

export function buildOptimizerConfigSection(state: OptimizerSessionState): OptimizerConfigSection {
  return {
    objective_weights: normalizeWeights(state.weights),
    pins: state.pins,
    samples: state.samples,
    seed: state.seed,
  };
}

export function optimizerFromConfigSection(
  section: unknown,
  scenario: Scenario,
  hwFromComponents: boolean,
): Partial<OptimizerSessionState> | null {
  if (!section || typeof section !== 'object') return null;
  const doc = section as Record<string, unknown>;
  const weights = doc.objective_weights ?? doc.weights;
  const pins = parseOptimizerPins(doc.pins);
  const out: Partial<OptimizerSessionState> = {};
  if (weights) out.weights = parseObjectiveWeights(weights);
  if (pins) out.pins = mergeOptimizerPins(scenario, hwFromComponents, pins);
  if (doc.samples !== undefined) out.samples = clampSamples(doc.samples);
  if (typeof doc.seed === 'number' && !Number.isNaN(doc.seed)) out.seed = doc.seed;
  return Object.keys(out).length > 0 ? out : null;
}
