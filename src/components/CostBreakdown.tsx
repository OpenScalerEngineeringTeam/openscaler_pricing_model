import { BAR_COLORS, BAR_LABELS } from '../lib/constants';
import { fmt } from '../lib/pricing';
import type { ComputeResult } from '../types';

interface CostBreakdownProps {
  computed: ComputeResult;
}

export function CostBreakdown({ computed: C }: CostBreakdownProps) {
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
    </div>
  );
}
