import { describe, expect, it } from 'vitest';
import { applyConfigDocument, buildConfigDocument, CONFIG_VERSION } from './config';
import { DEFAULT_PARAMS } from './constants';
import { initialOptimizerSession } from './optimizerState';

describe('config optimizer section', () => {
  it('round-trips objective weights and pins', () => {
    const optimizer = {
      ...initialOptimizerSession('p2', true),
      weights: { profit: 0.5, price: 0.3, ops: 0.1, stability: 0.1 },
    };
    const doc = buildConfigDocument(DEFAULT_PARAMS, 'p2', 'usd', 'fx', true, optimizer);
    expect(doc.optimizer?.objective_weights.profit).toBeCloseTo(0.5, 5);

    const applied = applyConfigDocument(doc, () => { });
    expect(applied.optimizer?.weights?.profit).toBeCloseTo(0.5, 5);
    expect(applied.optimizer?.pins).toBeDefined();
    expect(applied.optimizer?.samples).toBe(optimizer.samples);
  });

  it('round-trips freeze pricing UI', () => {
    const doc = buildConfigDocument(DEFAULT_PARAMS, 'p2', 'usd', 'fx', false, undefined, {
      freezePrices: true,
      freezeUtilization: 0.45,
    });
    const applied = applyConfigDocument(doc, () => { });
    expect(applied.freezePrices).toBe(true);
    expect(applied.freezeUtilization).toBeCloseTo(0.45, 5);
  });

  it('uses format version 5', () => {
    const doc = buildConfigDocument(DEFAULT_PARAMS, 'p2', 'usd', 'fx', false, initialOptimizerSession('p2', false));
    expect((doc._meta as { format_version: number }).format_version).toBe(CONFIG_VERSION);
  });
});
