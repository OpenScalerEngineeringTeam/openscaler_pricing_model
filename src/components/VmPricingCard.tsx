import { fmt, formatListed, formatModelPrice, listedDzd, planBreakEvenDzd, priceFootnote } from '../lib/pricing';
import type { ComputeResult, ModelParams, Plan, PriceDisplay } from '../types';

interface VmPricingCardProps {
  plans: Plan[];
  params: ModelParams;
  computed: ComputeResult;
  priceDisplay: PriceDisplay;
}

export function VmPricingCard({ plans, params: P, computed: C, priceDisplay }: VmPricingCardProps) {
  const usd = P.usd_dzd;
  const marginPct = Math.round(P.margin * 100);

  const refPlan = { memory: P.avg_vm_ram, vcpus: P.avg_vm_vcpu, disk: P.avg_vm_disk_gb, transfer: P.avg_vm_transfer_tb };
  const refBeDzd = planBreakEvenDzd(refPlan, P, C);
  const refTargetDzd = refBeDzd / (1 - P.margin);
  const refBeUsd = refBeDzd / usd;
  const refTargetUsd = refTargetDzd / usd;
  const refBeMetric = priceDisplay === 'dzd' ? `${fmt(refBeDzd)} DZD` : `$${refBeUsd.toFixed(2)}`;
  const refTargetMetric = priceDisplay === 'dzd' ? `${fmt(refTargetDzd)} DZD` : `$${refTargetUsd.toFixed(2)}`;

  return (
    <div className="card">
      <div className="section-title">VM pricing vs catalog ({plans.length} plans)</div>
      <div className="vm-table-wrap">
        <table className="vm-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Spec</th>
              <th style={{ textAlign: 'right' }}>Listed</th>
              <th style={{ textAlign: 'right' }}>Break-even</th>
              <th style={{ textAlign: 'right' }}>Target (+{marginPct}%)</th>
              <th style={{ textAlign: 'right' }}>vs target</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((pl) => {
              const beDzd = planBreakEvenDzd(pl, P, C);
              const targetDzd = beDzd / (1 - P.margin);
              const beUsd = beDzd / usd;
              const targetUsd = targetDzd / usd;
              const listedVal = priceDisplay === 'dzd' ? listedDzd(pl, usd) : pl.monthly_usd;
              const targetVal = priceDisplay === 'dzd' ? targetDzd : targetUsd;
              const mgn = ((listedVal - targetVal) / targetVal) * 100;
              const cls = mgn >= 0 ? 'pill-ok' : mgn > -25 ? 'pill-warn' : 'pill-bad';
              const mgnLabel = mgn >= 0 ? `+${Math.round(mgn)}%` : `${Math.round(mgn)}%`;
              const beFmt = formatModelPrice(beDzd, beUsd, priceDisplay, 'cost');
              const targetFmt = formatModelPrice(targetDzd, targetUsd, priceDisplay);

              return (
                <tr key={pl.id}>
                  <td>
                    <div>{pl.name}</div>
                    <div className="plan-id">{pl.id}</div>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>
                    {pl.vcpus}c · {pl.memory}G · {pl.disk}G · {pl.transfer}T
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatListed(pl, priceDisplay, usd)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {beFmt.main}
                    {beFmt.sub && <span className="price-sub">{beFmt.sub}</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{targetFmt.main}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`pill ${cls}`}>{mgnLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
        </div>
        <div className="metric">
          <div className="metric-label">
            Break-even · {P.avg_vm_ram}G/{P.avg_vm_vcpu}c/{P.avg_vm_disk_gb}G/{P.avg_vm_transfer_tb}T
          </div>
          <div className={`metric-value${refBeUsd > 5 ? ' danger' : ' success'}`}>{refBeMetric}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Target · {Math.round(P.margin * 100)}% margin</div>
          <div className={`metric-value${refTargetUsd > 8 ? ' warn' : ''}`}>{refTargetMetric}</div>
        </div>
      </div>
    </div>
  );
}
