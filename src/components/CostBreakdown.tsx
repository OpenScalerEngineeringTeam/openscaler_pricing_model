import { BAR_COLORS, BAR_LABELS } from '../lib/constants';
import {
  capexPerPayingSlotDzd,
  fleetCapexDzd,
  hardwarePaybackMonths,
} from '../lib/fleetCapex';
import { computeAtUtilization, fleetMonthlyProfitFrozen } from '../lib/frozenPricing';
import { fleetMonthlyProfitDzd } from '../lib/fleetProfit';
import { fmt } from '../lib/pricing';
import type { ComputeResult, ModelParams, PriceDisplay, Scenario } from '../types';

interface CostBreakdownProps {
  params: ModelParams;
  computed: ComputeResult;
  scenario: Scenario;
  hwFromComponents: boolean;
  priceDisplay: PriceDisplay;
  freezePrices: boolean;
  freezeUtilization: number;
}

function formatMoney(dzd: number, priceDisplay: PriceDisplay, usdDzd: number): string {
  if (priceDisplay === 'dzd') return `${fmt(dzd)} DZD`;
  return `$${(dzd / usdDzd).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatPayback(months: number | null): { main: string; sub: string; tone: '' | ' warn' | ' danger' } {
  if (months === null) return { main: '—', sub: 'No profit at target margin', tone: ' danger' };
  const rounded = Math.round(months);
  const sub = months >= 12 ? `~${(months / 12).toFixed(1)} years` : 'Months at steady-state util';
  const tone = months > 84 ? ' danger' : months > 48 ? ' warn' : '';
  return { main: `${rounded} mo`, sub, tone };
}

export function CostBreakdown({
  params: P,
  computed: C,
  scenario,
  hwFromComponents,
  priceDisplay,
  freezePrices,
  freezeUtilization,
}: CostBreakdownProps) {
  const costs = [
    C.monthly_hw,
    C.monthly_power,
    C.monthly_rack,
    C.monthly_bw,
    C.monthly_storage,
    C.monthly_team,
    C.monthly_misc,
  ];
  const pcts = costs.map((c) => (c / C.total) * 100);

  const fleetCapex = fleetCapexDzd(P, C);
  const perSlot = capexPerPayingSlotDzd(P, C);
  const payback = formatPayback(hardwarePaybackMonths(P, C));
  const anchorC = freezePrices ? computeAtUtilization(P, freezeUtilization, scenario, hwFromComponents) : null;
  const fleetProfit = freezePrices && anchorC
    ? fleetMonthlyProfitFrozen(P, C, anchorC)
    : fleetMonthlyProfitDzd(P, C);

  return (
    <div>
      {costs.map((c, i) => (
        <div className="breakdown-row" key={BAR_LABELS[i]}>
          <span className="breakdown-name">{BAR_LABELS[i]}</span>
          <div className="breakdown-bar-wrap">
            <div className="breakdown-bar" style={{ width: `${Math.round(pcts[i])}%`, background: BAR_COLORS[i] }} />
          </div>
          <span className="breakdown-pct">{Math.round(pcts[i])}%</span>
          <span className="breakdown-val">{fmt(c)}</span>
        </div>
      ))}
      <div className="metrics-grid fleet-capex-metrics">
        <div className="metric">
          <div className="metric-label">Fleet CAPEX (landed HW)</div>
          <div className="metric-value">{formatMoney(fleetCapex, priceDisplay, P.usd_dzd)}</div>
          <div className="metric-sub">
            {P.num_servers} × {formatMoney(C.hw_landed_dzd, priceDisplay, P.usd_dzd)} / server
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">CAPEX / paying slot</div>
          <div className="metric-value">
            {perSlot !== null ? formatMoney(perSlot, priceDisplay, P.usd_dzd) : '—'}
          </div>
          <div className="metric-sub">One-time hardware per VM @ {Math.round(P.utilization * 100)}% util</div>
        </div>
        <div className="metric">
          <div className="metric-label">HW payback (CAPEX ÷ fleet profit)</div>
          <div className={`metric-value${payback.tone}`}>{payback.main}</div>
          <div className="metric-sub">
            {payback.sub} · {formatMoney(fleetProfit, priceDisplay, P.usd_dzd)} / mo
            {freezePrices && anchorC ? ` · frozen @ ${Math.round(freezeUtilization * 100)}% launch util` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
