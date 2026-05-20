import { describe, expect, it } from 'vitest';
import {
  formatSuggestedUsd,
  formatUsdPrice,
  priceStep,
  roundNiceUsd,
} from './nicePricing';

describe('priceStep', () => {
  it('uses 0.1 below $20 and 1 at or above', () => {
    expect(priceStep(7)).toBe(0.1);
    expect(priceStep(19.9)).toBe(0.1);
    expect(priceStep(20)).toBe(1);
  });
});

describe('roundNiceUsd', () => {
  it('rounds small prices to nearest 0.1', () => {
    expect(roundNiceUsd(1.24)).toBe(1.2);
    expect(roundNiceUsd(3.16)).toBe(3.2);
    expect(roundNiceUsd(7.24)).toBe(7.2);
  });

  it('rounds large prices to nearest 1', () => {
    expect(roundNiceUsd(23.4)).toBe(23);
    expect(roundNiceUsd(23.6)).toBe(24);
  });

  it('stays close to target for typical VM tiers', () => {
    for (const target of [1.8, 3.4, 7.2, 12.5, 18.9]) {
      expect(Math.abs(roundNiceUsd(target) - target)).toBeLessThanOrEqual(0.2);
    }
  });
});

describe('formatUsdPrice', () => {
  it('formats fractional small prices', () => {
    expect(formatUsdPrice(2.5)).toBe('$2.5');
    expect(formatUsdPrice(8)).toBe('$8');
    expect(formatUsdPrice(25)).toBe('$25');
  });
});

describe('formatSuggestedUsd', () => {
  it('formats USD suggested', () => {
    expect(formatSuggestedUsd(8, 'usd', 135)).toBe('$8');
  });

  it('formats DZD suggested', () => {
    expect(formatSuggestedUsd(8, 'dzd', 135)).toMatch(/DZD$/);
  });
});
