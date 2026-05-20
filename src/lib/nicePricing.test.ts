import { describe, expect, it } from 'vitest';
import {
  formatBand,
  formatSuggested,
  formatUsdPrice,
  nextLadderStepUsd,
  priceBandFromTarget,
  roundNiceUsd,
} from './nicePricing';

describe('roundNiceUsd', () => {
  it('rounds sub-$5 to half dollars upward', () => {
    expect(roundNiceUsd(1.2)).toBe(1.5);
    expect(roundNiceUsd(3.1)).toBeGreaterThanOrEqual(3);
  });

  it('rounds mid tier to whole dollars with charm endings', () => {
    const r = roundNiceUsd(7.2);
    expect(r).toBeGreaterThanOrEqual(7);
    expect(r).toBeLessThanOrEqual(10);
  });

  it('rounds $20+ to $5 steps', () => {
    expect(roundNiceUsd(23)).toBe(25);
  });
});

describe('nextLadderStepUsd', () => {
  it('steps above suggested price', () => {
    expect(nextLadderStepUsd(8)).toBeGreaterThan(8);
    expect(nextLadderStepUsd(25)).toBe(30);
  });
});

describe('priceBandFromTarget', () => {
  it('balanced band has low <= suggested <= high', () => {
    const band = priceBandFromTarget(7.2, 'balanced');
    expect(band.lowUsd).toBe(band.suggestedUsd);
    expect(band.highUsd).toBeGreaterThanOrEqual(band.suggestedUsd);
  });

  it('aggressive band caps high at suggested', () => {
    const band = priceBandFromTarget(12, 'aggressive');
    expect(band.highUsd).toBe(band.suggestedUsd);
    expect(band.lowUsd).toBeLessThanOrEqual(band.suggestedUsd);
  });

  it('premium band raises high above suggested', () => {
    const band = priceBandFromTarget(12, 'premium');
    expect(band.lowUsd).toBe(band.suggestedUsd);
    expect(band.highUsd).toBeGreaterThanOrEqual(band.suggestedUsd);
  });
});

describe('formatUsdPrice', () => {
  it('formats fractional small prices', () => {
    expect(formatUsdPrice(2.5)).toBe('$2.50');
    expect(formatUsdPrice(8)).toBe('$8');
  });
});

describe('formatBand and formatSuggested', () => {
  const band = priceBandFromTarget(8, 'balanced');

  it('formats USD band range', () => {
    expect(formatBand(band, 'usd', 135)).toMatch(/\$.*–\s*\$/);
  });

  it('formats DZD suggested', () => {
    expect(formatSuggested(band, 'dzd', 135)).toMatch(/DZD$/);
  });
});
