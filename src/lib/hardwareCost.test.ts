import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import { effectiveHwUsd, estimateServerHwUsd } from './hardwareCost';

describe('estimateServerHwUsd', () => {
  it('sums sockets, RAM, NVMe, motherboard, and chassis/misc unit costs', () => {
    const P = {
      ...DEFAULT_PARAMS,
      cpu_sockets: 2,
      ram_gb: 256,
      nvme_tb_per_server: 8,
      hw_usd_per_cpu_socket: 1000,
      hw_usd_per_gib_ram: 2,
      hw_usd_per_tb_nvme: 100,
      hw_usd_motherboard: 500,
      hw_usd_chassis_misc: 300,
    };
    expect(estimateServerHwUsd(P)).toBe(2 * 1000 + 256 * 2 + 8 * 100 + 500 + 300);
  });

  it('default unit prices land near the reference ~$4k server from the cost model doc', () => {
    const total = estimateServerHwUsd(DEFAULT_PARAMS);
    expect(total).toBeGreaterThanOrEqual(3500);
    expect(total).toBeLessThanOrEqual(4500);
  });
});

describe('effectiveHwUsd', () => {
  it('uses manual hw_usd when component mode is off', () => {
    const P = { ...DEFAULT_PARAMS, hw_usd: 9999 };
    expect(effectiveHwUsd(P, false)).toBe(9999);
  });

  it('ignores manual hw_usd when component mode is on', () => {
    const P = { ...DEFAULT_PARAMS, hw_usd: 9999 };
    expect(effectiveHwUsd(P, true)).toBe(estimateServerHwUsd(P));
    expect(effectiveHwUsd(P, true)).not.toBe(9999);
  });
});

describe('compute with component-based hardware', () => {
  it('uses component estimate for landed hardware in phase 2', () => {
    const manual = { ...DEFAULT_PARAMS, hw_usd: 2000 };
    const fromParts = { ...DEFAULT_PARAMS, hw_usd: 2000 };

    const manualResult = compute(manual, 'p2', false);
    const partsResult = compute(fromParts, 'p2', true);

    const expectedLanded = estimateServerHwUsd(fromParts) * (1 + fromParts.customs_pct) * fromParts.usd_dzd;
    expect(partsResult.hw_landed_dzd).toBeCloseTo(expectedLanded, 0);
    expect(partsResult.monthly_hw).toBeCloseTo(expectedLanded / fromParts.amort_months, 0);
    expect(partsResult.monthly_hw).not.toBe(manualResult.monthly_hw);
  });

  it('raises monthly hardware when RAM per server increases in component mode', () => {
    const base = compute(DEFAULT_PARAMS, 'p2', true);
    const moreRam = compute({ ...DEFAULT_PARAMS, ram_gb: 256 }, 'p2', true);
    expect(moreRam.monthly_hw).toBeGreaterThan(base.monthly_hw);
  });
});
