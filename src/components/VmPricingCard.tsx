import { useMemo, useState } from 'react';
import {
  computeAtUtilization,
  effectiveGrossMargin,
  fleetMonthlyProfitFrozen,
  frozenPlanTargetDzd,
} from '../lib/frozenPricing';
import { formatSuggestedUsd, roundNiceUsd } from '../lib/nicePricing';
import { fleetMonthlyProfitDzd } from '../lib/fleetProfit';
import { fmt, formatListed, formatModelPrice, planBreakEvenDzd, priceFootnote } from '../lib/pricing';
import { generateProposedCatalogWithMeta, smallestTierMaxPerServer } from '../lib/proposedCatalog';
import {
  fitLabel,
  hostCapacitySummary,
  maxPerServer,
  planFit
} from '../lib/slotCapacity';
import type { ComputeResult, ModelParams, Plan, PriceDisplay, Scenario } from '../types';
import { DEFAULT_CATALOG_FILTERS } from '../types';
import { ProposedCatalogFilters } from './ProposedCatalogFilters';

interface VmPricingCardProps {
  plans: Plan[];
  params: ModelParams;
  computed: ComputeResult;
  scenario: Scenario;
  hwFromComponents: boolean;
  priceDisplay: PriceDisplay;
  freezePrices: boolean;
  freezeUtilization: number;
  onFreezePrices: (enabled: boolean) => void;
  onFreezeUtilization: (util: number) => void;
}

type VmPricingTab = 'compare' | 'proposed';

export function VmPricingCard({
  plans,
  params: P,
  computed: C,
  scenario,
  hwFromComponents,
  priceDisplay,
  freezePrices,
  freezeUtilization,
  onFreezePrices,
  onFreezeUtilization,
}: VmPricingCardProps) {
  const usd = P.usd_dzd;
  const marginPct = Math.round(P.margin * 100);
  const launchUtilPct = Math.round(freezeUtilization * 100);
  const steadyUtilPct = Math.round(P.utilization * 100);
  const [activeTab, setActiveTab] = useState<VmPricingTab>('compare');
  const [catalogFilters, setCatalogFilters] = useState(DEFAULT_CATALOG_FILTERS);

  const anchorC = useMemo(
    () => (freezePrices ? computeAtUtilization(P, freezeUtilization, scenario, hwFromComponents) : null),
    [freezePrices, P, freezeUtilization, scenario, hwFromComponents],
  );

  const refPlan = { memory: P.avg_vm_ram, vcpus: P.avg_vm_vcpu, disk: P.avg_vm_disk_gb, transfer: P.avg_vm_transfer_tb };
  const refBeDzd = planBreakEvenDzd(refPlan, P, C);
  const refTargetDzd = freezePrices && anchorC
    ? frozenPlanTargetDzd(refPlan, P, anchorC)
    : refBeDzd / (1 - P.margin);
  const refBeUsd = refBeDzd / usd;
  const refTargetUsd = refTargetDzd / usd;
  const refBeMetric = priceDisplay === 'dzd' ? `${fmt(refBeDzd)} DZD` : `$${refBeUsd.toFixed(2)}`;
  const refTargetMetric = priceDisplay === 'dzd' ? `${fmt(refTargetDzd)} DZD` : `$${refTargetUsd.toFixed(2)}`;
  const effectiveMargin = effectiveGrossMargin(refTargetDzd, refBeDzd);
  const effectiveMarginPct =
    effectiveMargin !== null ? Math.round(effectiveMargin * 100) : null;
  const fleetProfitDzd =
    freezePrices && anchorC ? fleetMonthlyProfitFrozen(P, C, anchorC) : fleetMonthlyProfitDzd(P, C);
  const fleetProfitUsd = fleetProfitDzd / usd;
  const fleetProfitMetric =
    priceDisplay === 'dzd' ? `${fmt(fleetProfitDzd)} DZD` : `$${fleetProfitUsd.toFixed(0)}`;
  const fleetPayingSlots = Math.round(P.num_servers * C.paying_vms);

  const catalogSuggestions = useMemo(
    () =>
      plans.map((pl) => {
        const targetDzd =
          freezePrices && anchorC ? frozenPlanTargetDzd(pl, P, anchorC) : planBreakEvenDzd(pl, P, C) / (1 - P.margin);
        return { plan: pl, suggestedUsd: roundNiceUsd(targetDzd / usd) };
      }),
    [plans, P, C, usd, freezePrices, anchorC],
  );

  const proposedMeta = useMemo(
    () => generateProposedCatalogWithMeta(catalogFilters, P, C, freezePrices ? anchorC : null),
    [catalogFilters, P, C, freezePrices, anchorC],
  );
  const proposed = proposedMeta.plans;
  const proposedHiddenByPrice =
    catalogFilters.duplicatePriceStrategy !== 'show'
      ? proposedMeta.beforeDuplicateHandling - proposed.length
      : 0;

  const hostCap = useMemo(() => hostCapacitySummary(P), [P]);
  const smallestFit = smallestTierMaxPerServer(proposed);

  return (
    <div className="card">
      <div className="vm-card-header">
        <div className="params-tabs vm-pricing-tabs" role="tablist" aria-label="VM pricing views">
          <button
            type="button"
            className={`param-tab${activeTab === 'compare' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'compare'}
            aria-controls="vm-pricing-compare"
            id="vm-tab-compare"
            onClick={() => setActiveTab('compare')}
          >
            VM pricing vs catalog ({plans.length} plans)
          </button>
          <button
            type="button"
            className={`param-tab${activeTab === 'proposed' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'proposed'}
            aria-controls="vm-pricing-proposed"
            id="vm-tab-proposed"
            onClick={() => setActiveTab('proposed')}
          >
            Proposed catalog
          </button>
        </div>
      </div>

      <div className="freeze-pricing-bar">
        <label className="freeze-pricing-check">
          <input
            type="checkbox"
            checked={freezePrices}
            onChange={(e) => onFreezePrices(e.target.checked)}
          />
          Freeze retail prices at launch utilization
        </label>
        {freezePrices && (
          <label className="freeze-pricing-util">
            <span>Launch util</span>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={freezeUtilization}
              onChange={(e) => onFreezeUtilization(Number(e.target.value))}
            />
            <span className="freeze-pricing-util-val">{launchUtilPct}%</span>
          </label>
        )}
        {freezePrices && (
          <p className="freeze-pricing-hint">
            Suggested prices stay at {marginPct}% margin @ {launchUtilPct}% util. Steady-state util ({steadyUtilPct}%)
            drives costs — effective margin updates below.
          </p>
        )}
      </div>

      {activeTab === 'compare' && (
        <div id="vm-pricing-compare" role="tabpanel" aria-labelledby="vm-tab-compare">
          <div className="vm-table-wrap">
            <table className="vm-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Spec</th>
                  <th>Fit</th>
                  <th style={{ textAlign: 'right' }}>Listed</th>
                  <th style={{ textAlign: 'right' }}>Break-even</th>
                  <th style={{ textAlign: 'right' }}>
                    {freezePrices ? `Frozen (+${marginPct}% @ ${launchUtilPct}%)` : `Target (+${marginPct}%)`}
                  </th>
                  {freezePrices && (
                    <th style={{ textAlign: 'right' }}>Eff. margin @ {steadyUtilPct}%</th>
                  )}
                  <th style={{ textAlign: 'right' }}>Suggested</th>
                </tr>
              </thead>
              <tbody>
                {catalogSuggestions.map(({ plan: pl, suggestedUsd }) => {
                  const beDzd = planBreakEvenDzd(pl, P, C);
                  const targetDzd =
                    freezePrices && anchorC ? frozenPlanTargetDzd(pl, P, anchorC) : beDzd / (1 - P.margin);
                  const effMargin = effectiveGrossMargin(targetDzd, beDzd);
                  const beUsd = beDzd / usd;
                  const targetUsd = targetDzd / usd;
                  const beFmt = formatModelPrice(beDzd, beUsd, priceDisplay, 'cost');
                  const targetFmt = formatModelPrice(targetDzd, targetUsd, priceDisplay);
                  const maxHost = maxPerServer(pl, P);
                  const fit = planFit(maxHost);
                  const fitCls = `pill fit-${fit}`;

                  return (
                    <tr key={pl.id}>
                      <td>
                        <div>{pl.name}</div>
                        <div className="plan-id">{pl.id}</div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {pl.vcpus}c · {pl.memory}G · {pl.disk}G · {pl.transfer}T
                      </td>
                      <td>
                        <span className={fitCls} title={fitLabel(fit, maxHost)}>
                          {fit} · {fitLabel(fit, maxHost)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatListed(pl, priceDisplay, usd)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {beFmt.main}
                        {beFmt.sub && <span className="price-sub">{beFmt.sub}</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{targetFmt.main}</td>
                      {freezePrices && (
                        <td style={{ textAlign: 'right' }}>
                          {effMargin !== null ? (
                            <span
                              className={
                                effMargin < P.margin ? 'pill eff-margin-low' : effMargin > P.margin ? 'pill eff-margin-high' : 'pill'
                              }
                            >
                              {Math.round(effMargin * 100)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td style={{ textAlign: 'right' }}>{formatSuggestedUsd(suggestedUsd, priceDisplay, usd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'proposed' && (
        <div id="vm-pricing-proposed" className="proposed-section" role="tabpanel" aria-labelledby="vm-tab-proposed">
          <div className="proposed-header">
            <span className="proposed-meta">
              {proposed.length} tiers
              {proposedHiddenByPrice > 0 &&
                (catalogFilters.duplicatePriceStrategy === 'collapse'
                  ? ` (${proposedHiddenByPrice} hidden — same rounded price)`
                  : ` (${proposedHiddenByPrice} hidden — merged profiles / stair-step)`)}
              {' · '}
              host {hostCap.binding} ·{' '}
              {smallestFit != null ? `≥${smallestFit} VMs/host (smallest shown)` : 'no tiers match filters'}
            </span>
          </div>
          <ProposedCatalogFilters filters={catalogFilters} onChange={setCatalogFilters} />
          <div className="vm-table-wrap">
            <table className="vm-table">
              <thead>
                <tr>
                  <th>Spec</th>
                  <th>Units</th>
                  <th>Fit</th>
                  <th style={{ textAlign: 'right' }}>Break-even</th>
                  <th style={{ textAlign: 'right' }}>Suggested</th>
                </tr>
              </thead>
              <tbody>
                {proposed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="proposed-empty">
                      No tiers match filters. Lower min fit or widen max vCPU/RAM.
                    </td>
                  </tr>
                ) : (
                  proposed.map((pl) => {
                    const beDzd = planBreakEvenDzd(pl, P, C);
                    const beUsd = beDzd / usd;
                    const beFmt = formatModelPrice(beDzd, beUsd, priceDisplay, 'cost');
                    const fit = pl.fit;
                    const fitCls = `pill fit-${fit}`;

                    return (
                      <tr key={pl.id}>
                        <td style={{ color: 'var(--color-text-secondary)' }}>
                          {pl.vcpus}c · {pl.memory}G · {pl.disk}G · {pl.transfer}T
                        </td>
                        <td>{pl.units}</td>
                        <td>
                          <span className={fitCls} title={fitLabel(fit, pl.maxPerServer)}>
                            {fit} · {fitLabel(fit, pl.maxPerServer)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {beFmt.main}
                          {beFmt.sub && <span className="price-sub">{beFmt.sub}</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatSuggestedUsd(pl.suggestedUsd, priceDisplay, usd)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="footnote footnote--vm" dangerouslySetInnerHTML={{ __html: priceFootnote(priceDisplay, usd) }} />
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-label">Cost / server / mo</div>
          <div className="metric-value">{fmt(C.total)} DZD</div>
          <div className="metric-sub">FX {P.usd_dzd}</div>
        </div>
        <div className="metric">
          <div className="metric-label">
            VM slots · {Math.round(P.utilization * 100)}% · {C.binding}
          </div>
          <div className="metric-value">
            {Math.round(C.paying_vms)} / {C.sellable_vms}
          </div>
          <div className="metric-sub">
            Physical: {Math.round(hostCap.sellableRamGiB)}G RAM · {hostCap.sellableVcpus} vCPU
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">
            Break-even · {P.avg_vm_ram}G/{P.avg_vm_vcpu}c/{P.avg_vm_disk_gb}G/{P.avg_vm_transfer_tb}T
          </div>
          <div className={`metric-value${refBeUsd > 5 ? ' danger' : ' success'}`}>{refBeMetric}</div>
        </div>
        <div className="metric">
          <div className="metric-label">
            {freezePrices ? `Frozen price @ ${launchUtilPct}% util` : `Target · ${Math.round(P.margin * 100)}% margin`}
          </div>
          <div className={`metric-value${refTargetUsd > 8 ? ' warn' : ''}`}>{refTargetMetric}</div>
          {freezePrices && (
            <div className="metric-sub">Set at {marginPct}% margin when util was {launchUtilPct}%</div>
          )}
        </div>
        {freezePrices && effectiveMarginPct !== null && (
          <div className="metric">
            <div className="metric-label">Effective margin @ {steadyUtilPct}% util</div>
            <div
              className={`metric-value${
                effectiveMarginPct < marginPct ? ' danger' : effectiveMarginPct > marginPct ? ' success' : ''
              }`}
            >
              {effectiveMarginPct}%
            </div>
            <div className="metric-sub">
              Break-even {refBeMetric} vs frozen {refTargetMetric}
            </div>
          </div>
        )}
        <div className="metric">
          <div className="metric-label">
            Fleet profit / mo{freezePrices ? ' · frozen prices' : ' · target margin'}
          </div>
          <div className="metric-value success">{fleetProfitMetric}</div>
          <div className="metric-sub">
            {P.num_servers} servers · {fleetPayingSlots} paying slots @ {steadyUtilPct}% util
          </div>
        </div>
      </div>
    </div>
  );
}
