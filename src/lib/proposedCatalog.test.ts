import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS, DEFAULT_PLANS } from './constants';
import { generateProposedCatalog, smallestTierMaxPerServer } from './proposedCatalog';
import { canonicalUnits } from './slotCapacity';
import { DEFAULT_CATALOG_FILTERS } from '../types';

describe('generateProposedCatalog', () => {
  const P = DEFAULT_PARAMS;
  const C = compute(P, 'p2');

  it('returns at most maxRows tiers', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, DEFAULT_PLANS, P, C);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(DEFAULT_CATALOG_FILTERS.maxRows);
  });

  it('only includes tiers meeting minFit on host', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, DEFAULT_PLANS, P, C);
    for (const row of rows) {
      expect(row.maxPerServer).toBeGreaterThanOrEqual(DEFAULT_CATALOG_FILTERS.minFit);
      expect(row.units).toBe(canonicalUnits(row.memory));
    }
  });

  it('sorts by units then price', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, DEFAULT_PLANS, P, C);
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      if (cur.units === prev.units) {
        expect(cur.band.suggestedUsd).toBeGreaterThanOrEqual(prev.band.suggestedUsd);
      } else {
        expect(cur.units).toBeGreaterThan(prev.units);
      }
    }
  });

  it('includes shared entry when profile enabled', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, DEFAULT_PLANS, P, C);
    expect(rows.some((r) => r.vcpus === 1 && r.memory === 0.5)).toBe(true);
  });

  it('respects maxVcpus and maxRam caps', () => {
    const tight = {
      ...DEFAULT_CATALOG_FILTERS,
      maxVcpus: 2,
      maxRam: 4,
      maxRows: 50,
      profiles: { shared: true, balanced: true, general: false, memory: false },
    };
    const rows = generateProposedCatalog(tight, DEFAULT_PLANS, P, C);
    for (const row of rows) {
      expect(row.vcpus).toBeLessThanOrEqual(2);
      expect(row.memory).toBeLessThanOrEqual(4);
    }
  });

  it('assigns nearest catalog plan id', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, DEFAULT_PLANS, P, C);
    expect(rows[0].nearestPlanId).toBeDefined();
    expect(DEFAULT_PLANS.some((p) => p.id === rows[0].nearestPlanId)).toBe(true);
  });

  it('returns empty when minFit exceeds host capacity for all candidates', () => {
    const impossible = { ...DEFAULT_CATALOG_FILTERS, minFit: 200, maxRows: 10 };
    expect(generateProposedCatalog(impossible, DEFAULT_PLANS, P, C)).toHaveLength(0);
  });
});

describe('smallestTierMaxPerServer', () => {
  it('returns null for empty list', () => {
    expect(smallestTierMaxPerServer([])).toBeNull();
  });

  it('returns minimum maxPerServer across tiers', () => {
    const P = DEFAULT_PARAMS;
    const C = compute(P, 'p2');
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, DEFAULT_PLANS, P, C);
    const min = smallestTierMaxPerServer(rows);
    expect(min).toBe(Math.min(...rows.map((r) => r.maxPerServer)));
  });
});
