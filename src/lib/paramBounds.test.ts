import { describe, expect, it } from 'vitest';
import { enumerateSteps, getParamBounds, snapParam } from './paramBounds';

describe('snapParam', () => {
  it('clamps and snaps to step grid', () => {
    const bound = { min: 0.1, max: 0.7, step: 0.05 };
    expect(snapParam(0.12, bound)).toBe(0.1);
    expect(snapParam(0.68, bound)).toBe(0.7);
    expect(snapParam(0.44, bound)).toBe(0.45);
  });
});

describe('getParamBounds', () => {
  it('includes margin bounds in phase 2', () => {
    const bounds = getParamBounds('p2', false);
    expect(bounds.margin).toEqual({ min: 0.1, max: 0.7, step: 0.05 });
  });

  it('omits hw_usd when component estimate is on', () => {
    const manual = getParamBounds('p2', false);
    const components = getParamBounds('p2', true);
    expect(manual.hw_usd).toBeDefined();
    expect(components.hw_usd).toBeUndefined();
  });
});

describe('enumerateSteps', () => {
  it('covers min through max inclusive', () => {
    const steps = enumerateSteps({ min: 2, max: 4, step: 1 });
    expect(steps).toEqual([2, 3, 4]);
  });
});
