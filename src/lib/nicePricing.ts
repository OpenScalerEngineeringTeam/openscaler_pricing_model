import { fmt } from './pricing';
import type { PriceDisplay } from '../types';

/** $0.1 for small prices, $1 for large — keeps suggestions close to target. */
export function priceStep(targetUsd: number): number {
  return targetUsd < 20 ? 0.1 : 1;
}

function roundToStep(value: number, step: number): number {
  const n = Math.round(value / step) * step;
  return step === 0.1 ? Math.round(n * 10) / 10 : Math.round(n);
}

/** Nearest 0.1 (small) or 1 (large) to target. */
export function roundNiceUsd(targetUsd: number): number {
  if (targetUsd <= 0) return 0.1;
  return roundToStep(targetUsd, priceStep(targetUsd));
}

export function formatUsdPrice(usd: number): string {
  if (priceStep(usd) === 0.1) {
    const n = Math.round(usd * 10) / 10;
    return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(1)}`;
  }
  return `$${Math.round(usd)}`;
}

export function formatSuggestedUsd(
  suggestedUsd: number,
  priceDisplay: PriceDisplay,
  usdDzd: number,
): string {
  if (priceDisplay === 'dzd') return `${fmt(suggestedUsd * usdDzd)} DZD`;
  return formatUsdPrice(suggestedUsd);
}
