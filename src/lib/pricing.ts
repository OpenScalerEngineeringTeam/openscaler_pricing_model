import type { ComputeResult, ModelParams, Plan, PriceDisplay } from '../types';

export function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

export function listedDzd(pl: Plan, usdDzd: number): number {
  return pl.monthly_usd * usdDzd;
}

export function planBreakEvenDzd(
  pl: Pick<Plan, 'memory' | 'vcpus' | 'disk' | 'transfer'>,
  P: ModelParams,
  C: ComputeResult,
): number {
  const computeScale = Math.max(pl.memory / P.avg_vm_ram, pl.vcpus / P.avg_vm_vcpu);
  return (
    C.compute_cost_per_paying_vm * computeScale +
    pl.disk * C.storage_per_gb_mo +
    pl.transfer * C.transfer_per_tb_mo
  );
}

export function priceFootnote(priceDisplay: PriceDisplay, usdDzd: number): string {
  if (priceDisplay === 'dzd') {
    return `All amounts in DZD at <strong>${usdDzd} DZD/$</strong>. <strong>Listed</strong> = catalog $ × FX. <strong>Break-even &amp; target</strong> from the cost model. <strong>vs target</strong> compares listed vs target in DZD.`;
  }
  return `All amounts in USD. Costs use <strong>${usdDzd} DZD/$</strong> internally; break-even and target are converted from the DZD cost model. Switch to DZD to see retail prices in dinars.`;
}

export function formatListed(pl: Plan, priceDisplay: PriceDisplay, usdDzd: number): string {
  if (priceDisplay === 'dzd') return `${fmt(listedDzd(pl, usdDzd))} DZD`;
  return `$${pl.monthly_usd.toFixed(2)}`;
}

export function formatModelPrice(
  dzd: number,
  usd: number,
  priceDisplay: PriceDisplay,
  hint?: 'cost',
): { main: string; sub?: string } {
  if (priceDisplay === 'dzd') {
    const main = `${fmt(dzd)} DZD`;
    if (hint === 'cost') return { main, sub: 'cost basis' };
    return { main };
  }
  return { main: `$${usd.toFixed(2)}` };
}
