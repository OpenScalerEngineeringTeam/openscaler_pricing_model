import { describe, expect, it } from 'vitest';
import {
  OPTIMIZER_DEFAULT_PINNED_KEYS,
  OPTIMIZER_EXCLUDED_KEYS,
  defaultOptimizerPins,
  enumerateSteps,
  getOptimizerControlFields,
  getParamBounds,
  snapParam,
} from './paramBounds';

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

describe('getOptimizerControlFields', () => {
  it('excludes exchange rate and import overhead', () => {
    const keys = getOptimizerControlFields('p2', false).map((f) => f.key);
    for (const key of OPTIMIZER_EXCLUDED_KEYS) {
      expect(keys).not.toContain(key);
    }
    expect(keys).toContain('margin');
    expect(keys).toContain('num_servers');
  });
});

describe('defaultOptimizerPins', () => {
  it('pins fleet assumptions and unpins capacity levers in phase 2', () => {
    const pins = defaultOptimizerPins('p2', false);
    for (const key of OPTIMIZER_DEFAULT_PINNED_KEYS) {
      if (key in pins) expect(pins[key]).toBe(true);
    }
    expect(pins.num_servers).toBe(true);
    expect(pins.cpu_oversub).toBe(false);
    expect(pins.ram_oversub).toBe(false);
    expect(pins.nvme_tb_per_server).toBe(false);
    expect(pins.utilization).toBe(false);
    expect(pins.margin).toBe(false);
    expect(pins.hw_usd).toBe(false);
  });

  it('does not pin keys that are excluded from the matrix', () => {
    const pins = defaultOptimizerPins('p2', false);
    for (const key of OPTIMIZER_EXCLUDED_KEYS) {
      expect(pins[key]).toBeUndefined();
    }
  });
});

describe('enumerateSteps', () => {
  it('covers min through max inclusive', () => {
    const steps = enumerateSteps({ min: 2, max: 4, step: 1 });
    expect(steps).toEqual([2, 3, 4]);
  });
});
