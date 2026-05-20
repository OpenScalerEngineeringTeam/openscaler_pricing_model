import { fmt } from './pricing';
import type { PriceBand, PriceDisplay, PricingStrategy } from '../types';

function roundUpToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function roundDownToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

/** Psychological retail rounding (DO-style ladder). */
export function roundNiceUsd(targetUsd: number): number {
  if (targetUsd <= 0) return 0.5;
  if (targetUsd < 5) {
    const half = Math.round(targetUsd * 2) / 2;
    return half < targetUsd ? half + 0.5 : half;
  }
  if (targetUsd < 20) {
    const base = Math.round(targetUsd);
    const endings = [base, Math.floor(targetUsd / 10) * 10 + 5, Math.floor(targetUsd / 10) * 10 + 9];
    const candidates = [...new Set(endings.filter((e) => e >= targetUsd * 0.95 && e > 0))].sort(
      (a, b) => a - b,
    );
    return candidates[0] ?? base;
  }
  if (targetUsd < 100) return roundUpToStep(targetUsd, 5);
  return roundUpToStep(targetUsd, 10);
}

/** Next ladder step above a price (for balanced band high). */
export function nextLadderStepUsd(priceUsd: number): number {
  if (priceUsd < 5) return priceUsd + 0.5;
  if (priceUsd < 20) {
    const mod = priceUsd % 10;
    if (mod <= 5) return Math.floor(priceUsd / 10) * 10 + 5;
    if (mod <= 9) return Math.floor(priceUsd / 10) * 10 + 9;
    return Math.ceil(priceUsd / 10) * 10 + 5;
  }
  if (priceUsd < 100) return priceUsd + 5;
  return priceUsd + 10;
}

export function priceBandFromTarget(targetUsd: number, strategy: PricingStrategy): PriceBand {
  const suggestedUsd = roundNiceUsd(targetUsd);
  let lowUsd: number;
  let highUsd: number;

  switch (strategy) {
    case 'aggressive':
      lowUsd = roundDownToStep(targetUsd * 0.97, targetUsd < 5 ? 0.5 : targetUsd < 20 ? 1 : targetUsd < 100 ? 5 : 10);
      highUsd = suggestedUsd;
      break;
    case 'premium':
      lowUsd = suggestedUsd;
      highUsd = roundNiceUsd(targetUsd * 1.08);
      break;
    case 'balanced':
    default:
      lowUsd = suggestedUsd;
      highUsd = Math.max(nextLadderStepUsd(suggestedUsd), suggestedUsd);
      break;
  }

  if (lowUsd > highUsd) lowUsd = highUsd;
  return { lowUsd, suggestedUsd, highUsd };
}

export function formatUsdPrice(usd: number): string {
  if (usd < 20 && usd % 1 !== 0) return `$${usd.toFixed(2)}`;
  return `$${usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2)}`;
}

export function formatBand(
  band: PriceBand,
  priceDisplay: PriceDisplay,
  usdDzd: number,
): string {
  if (priceDisplay === 'dzd') {
    const lo = fmt(band.lowUsd * usdDzd);
    const hi = fmt(band.highUsd * usdDzd);
    return `${lo} – ${hi} DZD`;
  }
  return `${formatUsdPrice(band.lowUsd)} – ${formatUsdPrice(band.highUsd)}`;
}

export function formatSuggested(
  band: PriceBand,
  priceDisplay: PriceDisplay,
  usdDzd: number,
): string {
  if (priceDisplay === 'dzd') return `${fmt(band.suggestedUsd * usdDzd)} DZD`;
  return formatUsdPrice(band.suggestedUsd);
}
