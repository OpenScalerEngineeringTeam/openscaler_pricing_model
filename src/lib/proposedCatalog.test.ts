import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { DEFAULT_PARAMS } from './constants';
import {
  applyDuplicatePriceStrategy,
  generateProposedCatalog,
  isBetterSpec,
  smallestTierMaxPerServer,
} from './proposedCatalog';
import { canonicalUnits } from './slotCapacity';
import { DEFAULT_CATALOG_FILTERS } from '../types';

describe('generateProposedCatalog', () => {
  const P = DEFAULT_PARAMS;
  const C = compute(P, 'p2');

  it('returns at most maxRows tiers', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, P, C);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(DEFAULT_CATALOG_FILTERS.maxRows);
  });

  it('only includes tiers meeting minFit on host', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, P, C);
    for (const row of rows) {
      expect(row.maxPerServer).toBeGreaterThanOrEqual(DEFAULT_CATALOG_FILTERS.minFit);
      expect(row.units).toBe(canonicalUnits(row.memory));
    }
  });

  it('sorts by units then price', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, P, C);
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      expect(cur.units).toBeGreaterThanOrEqual(prev.units);
      if (cur.units === prev.units) {
        expect(cur.suggestedUsd).toBeGreaterThanOrEqual(prev.suggestedUsd);
      } else {
        expect(cur.suggestedUsd).toBeGreaterThan(prev.suggestedUsd);
      }
    }
  });

  it('collapse removes duplicate rounded prices (keeps best spec)', () => {
    const all = generateProposedCatalog(
      { ...DEFAULT_CATALOG_FILTERS, duplicatePriceStrategy: 'show', maxRows: 50 },
      P,
      C,
    );
    const collapsed = applyDuplicatePriceStrategy(all, 'collapse');
    const prices = collapsed.map((r) => r.suggestedUsd);
    expect(new Set(prices).size).toBe(prices.length);
    expect(collapsed.length).toBeLessThan(all.length);
    for (const row of collapsed) {
      const peers = all.filter((r) => r.suggestedUsd === row.suggestedUsd);
      expect(peers.some((r) => r.id === row.id)).toBe(true);
      expect(peers.every((r) => !isBetterSpec(r, row))).toBe(true);
    }
  });

  it('bump keeps one best spec per units and strictly increasing prices', () => {
    const all = generateProposedCatalog(
      { ...DEFAULT_CATALOG_FILTERS, duplicatePriceStrategy: 'show', maxRows: 50 },
      P,
      C,
    );
    const bumped = applyDuplicatePriceStrategy(all, 'bump');
    const unitCounts = new Map<number, number>();
    for (const row of bumped) {
      unitCounts.set(row.units, (unitCounts.get(row.units) ?? 0) + 1);
    }
    for (const count of unitCounts.values()) expect(count).toBe(1);
    for (let i = 1; i < bumped.length; i++) {
      expect(bumped[i].units).toBeGreaterThan(bumped[i - 1].units);
      expect(bumped[i].suggestedUsd).toBeGreaterThan(bumped[i - 1].suggestedUsd);
    }
    for (const row of bumped) {
      const peers = all.filter((r) => r.units === row.units);
      expect(peers.every((r) => !isBetterSpec(r, row))).toBe(true);
    }
  });

  it('includes shared entry when profile enabled', () => {
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, P, C);
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
    const rows = generateProposedCatalog(tight, P, C);
    for (const row of rows) {
      expect(row.vcpus).toBeLessThanOrEqual(2);
      expect(row.memory).toBeLessThanOrEqual(4);
    }
  });

  it('returns empty when minFit exceeds host capacity for all candidates', () => {
    const impossible = { ...DEFAULT_CATALOG_FILTERS, minFit: 200, maxRows: 10 };
    expect(generateProposedCatalog(impossible, P, C)).toHaveLength(0);
  });
});

describe('smallestTierMaxPerServer', () => {
  it('returns null for empty list', () => {
    expect(smallestTierMaxPerServer([])).toBeNull();
  });

  it('returns minimum maxPerServer across tiers', () => {
    const P = DEFAULT_PARAMS;
    const C = compute(P, 'p2');
    const rows = generateProposedCatalog(DEFAULT_CATALOG_FILTERS, P, C);
    const min = smallestTierMaxPerServer(rows);
    expect(min).toBe(Math.min(...rows.map((r) => r.maxPerServer)));
  });
});
