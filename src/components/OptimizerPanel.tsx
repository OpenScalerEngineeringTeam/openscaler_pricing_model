import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultOptimizerPins, getOptimizerControlFields } from '../lib/paramBounds';
import {
  DEFAULT_OBJECTIVE_WEIGHTS,
  OBJECTIVE_WEIGHT_LABELS,
  evaluateBalancedObjective,
  normalizeWeights,
  type ObjectiveWeights,
} from '../lib/objectives';
import { runSearch, type SearchResult } from '../lib/search';
import { fmt } from '../lib/pricing';
import type { ModelParams, Scenario } from '../types';

export type PinState = Partial<Record<keyof ModelParams, boolean>>;

interface OptimizerPanelProps {
  params: ModelParams;
  scenario: Scenario;
  hwFromComponents: boolean;
  onApply: (params: ModelParams) => void;
  onBack: () => void;
}

const WEIGHT_KEYS = Object.keys(DEFAULT_OBJECTIVE_WEIGHTS) as (keyof ObjectiveWeights)[];

function formatPct(w: number): string {
  return `${Math.round(w * 100)}%`;
}

function formatDelta(n: number, suffix: string): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${fmt(n)}${suffix}`;
}

export function OptimizerPanel({
  params,
  scenario,
  hwFromComponents,
  onApply,
  onBack,
}: OptimizerPanelProps) {
  const fields = useMemo(
    () => getOptimizerControlFields(scenario, hwFromComponents),
    [scenario, hwFromComponents],
  );
  const searchableKeys = useMemo(() => fields.map((f) => f.key), [fields]);

  const [pins, setPins] = useState<PinState>(() => defaultOptimizerPins(scenario, hwFromComponents));

  useEffect(() => {
    setPins(defaultOptimizerPins(scenario, hwFromComponents));
  }, [scenario, hwFromComponents]);

  const [weights, setWeights] = useState<ObjectiveWeights>(() => ({ ...DEFAULT_OBJECTIVE_WEIGHTS }));
  const [samples, setSamples] = useState(1000);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const cancelRef = useRef(false);

  const freeKeys = useMemo(
    () => searchableKeys.filter((k) => !pins[k]),
    [searchableKeys, pins],
  );

  const evalCtx = useMemo(
    () => ({
      baseline: params,
      freeKeys,
      weights: normalizeWeights(weights),
      scenario,
      hwFromComponents,
    }),
    [params, freeKeys, weights, scenario, hwFromComponents],
  );

  const baselineEv = useMemo(
    () => evaluateBalancedObjective(params, evalCtx),
    [params, evalCtx],
  );

  const setWeight = useCallback((key: keyof ObjectiveWeights, pct: number) => {
    const v = Math.max(0, Math.min(100, pct)) / 100;
    setWeights((prev) => normalizeWeights({ ...prev, [key]: v }));
  }, []);

  const resetWeights = useCallback(() => {
    setWeights({ ...DEFAULT_OBJECTIVE_WEIGHTS });
  }, []);

  const togglePin = useCallback((key: keyof ModelParams) => {
    setPins((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const pinAll = useCallback(() => {
    const next: PinState = {};
    for (const f of fields) next[f.key] = true;
    setPins(next);
  }, [fields]);
  const unpinAll = useCallback(
    () => setPins(defaultOptimizerPins(scenario, hwFromComponents)),
    [scenario, hwFromComponents],
  );

  const handleRun = useCallback(() => {
    if (freeKeys.length === 0) {
      setError('Unpin at least one parameter to search.');
      return;
    }
    setError('');
    setRunning(true);
    setResult(null);
    cancelRef.current = false;

    window.setTimeout(() => {
      if (cancelRef.current) {
        setRunning(false);
        return;
      }
      try {
        const searchResult = runSearch({
          baseline: params,
          freeKeys,
          weights: normalizeWeights(weights),
          scenario,
          hwFromComponents,
          samples,
          seed,
          topK: 10,
        });
        setResult(searchResult);
      } catch (e) {
        setError((e as Error).message || String(e));
      } finally {
        setRunning(false);
      }
    }, 0);
  }, [freeKeys, params, weights, scenario, hwFromComponents, samples, seed]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
  }, []);

  const best = result?.top[0];
  const normalized = normalizeWeights(weights);

  return (
    <div className="optimizer-panel">
      <div className="optimizer-header">
        <div>
          <h3 className="optimizer-title">Parameter optimizer</h3>
          <p className="optimizer-desc">
            Balanced search: improve profit and competitive pricing while keeping ops realistic and changes
            near your current model. Checked = pinned. Exchange rate, import overhead, power, rack, and transit
            are always fixed at model values.
          </p>
        </div>
        <button type="button" className="file-btn" onClick={onBack}>
          Back to model
        </button>
      </div>

      <div className="optimizer-grid">
        <section className="card optimizer-section">
          <div className="section-title">Balance priorities</div>
          <p className="param-group-desc optimizer-weights-hint">
            Weights always sum to 100%. Default: 40% profit, 35% price, 15% ops, 10% stability.
          </p>
          {WEIGHT_KEYS.map((key) => (
            <label key={key} className="optimizer-weight-row">
              <span className="optimizer-weight-label">
                {OBJECTIVE_WEIGHT_LABELS[key]} ({formatPct(normalized[key])})
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(weights[key] * 100)}
                onChange={(e) => setWeight(key, +e.target.value)}
                disabled={running}
              />
            </label>
          ))}
          <button type="button" className="file-btn file-btn--sm" onClick={resetWeights} disabled={running}>
            Reset to balanced
          </button>

          <p className="optimizer-guardrails param-group-desc">
            Guardrails: CPU oversub ≤ 5×, RAM ≤ 1.35×, utilization ≤ 90%, margin 15–45%, salary/team ≥
            baseline when unpinned.
          </p>

          <div className="optimizer-settings">
            <label className="optimizer-field">
              <span>Random samples</span>
              <input
                type="number"
                min={100}
                max={5000}
                step={100}
                value={samples}
                onChange={(e) => setSamples(Math.max(100, +e.target.value || 1000))}
                disabled={running}
              />
            </label>
            <label className="optimizer-field">
              <span>Seed</span>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(+e.target.value || 42)}
                disabled={running}
              />
            </label>
          </div>

          <div className="optimizer-actions">
            <button type="button" className="file-btn file-btn--primary" onClick={handleRun} disabled={running}>
              {running ? 'Searching…' : 'Run search'}
            </button>
            {running && (
              <button type="button" className="file-btn" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
          {error && <p className="optimizer-error">{error}</p>}
        </section>

        <section className="card optimizer-section">
          <div className="optimizer-pin-header">
            <div className="section-title">Pin matrix ({freeKeys.length} free)</div>
            <div className="optimizer-pin-bulk">
              <button type="button" className="file-btn file-btn--sm" onClick={pinAll} disabled={running}>
                Pin all
              </button>
              <button type="button" className="file-btn file-btn--sm" onClick={unpinAll} disabled={running}>
                Unpin all
              </button>
            </div>
          </div>
          <div className="optimizer-pin-list">
            {fields.map((f) => (
              <label key={f.key} className="optimizer-pin-row">
                <input
                  type="checkbox"
                  checked={pins[f.key] === true}
                  onChange={() => togglePin(f.key)}
                  disabled={running}
                />
                <span className="optimizer-pin-label">{f.label}</span>
                <span className="optimizer-pin-val">
                  {f.fmt ? f.fmt(params[f.key]) : fmt(params[f.key])}
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="card optimizer-section optimizer-baseline">
        <div className="section-title">Current baseline</div>
        <div className="metrics-grid">
          <div className="metric">
            <div className="metric-label">Balance score</div>
            <div className="metric-value">{baselineEv.score.toFixed(3)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Fleet profit / mo</div>
            <div className="metric-value">{fmt(baselineEv.metrics.fleetProfitDzd)} DZD</div>
          </div>
          <div className="metric">
            <div className="metric-label">Ref target</div>
            <div className="metric-value">${baselineEv.metrics.refTargetUsd.toFixed(2)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Paying VMs / host</div>
            <div className="metric-value">
              {baselineEv.metrics.payingVms.toFixed(1)} ({baselineEv.metrics.binding})
            </div>
          </div>
        </div>
      </section>

      {result && (
        <section className="card optimizer-section">
          <div className="optimizer-results-header">
            <div className="section-title">Results</div>
            {result.improved ? (
              <span className="optimizer-badge success">Improved vs baseline</span>
            ) : (
              <span className="optimizer-badge">No improvement found</span>
            )}
          </div>
          <div className="vm-table-wrap">
            <table className="vm-table optimizer-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Score</th>
                  <th>Profit Δ</th>
                  <th>Price Δ</th>
                  <th>Fleet profit</th>
                  <th>Ref $</th>
                  <th>Paying/host</th>
                  <th>Sub-scores</th>
                  <th>Changed</th>
                </tr>
              </thead>
              <tbody>
                {result.top.map((row, i) => {
                  const changed = freeKeys
                    .filter((k) => row.params[k] !== params[k])
                    .map((k) => fields.find((f) => f.key === k)?.label ?? k);
                  const sub = row.metrics.subScores;
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{row.score.toFixed(3)}</td>
                      <td>{formatDelta(row.metrics.profitDeltaDzd, ' DZD')}</td>
                      <td>
                        {row.metrics.refTargetUsdDelta === 0
                          ? '—'
                          : `${row.metrics.refTargetUsdDelta > 0 ? '+' : ''}$${row.metrics.refTargetUsdDelta.toFixed(2)}`}
                      </td>
                      <td>{fmt(row.metrics.fleetProfitDzd)}</td>
                      <td>${row.metrics.refTargetUsd.toFixed(2)}</td>
                      <td>{row.metrics.payingVms.toFixed(1)}</td>
                      <td className="optimizer-subscores" title="Profit / Price / Ops / Stability">
                        {sub.profitNorm.toFixed(2)} / {sub.priceNorm.toFixed(2)} / {sub.opsNorm.toFixed(2)} /{' '}
                        {sub.stabilityNorm.toFixed(2)}
                      </td>
                      <td className="optimizer-changed">{changed.length ? changed.join(', ') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {best && (
            <div className="optimizer-apply-row">
              <button
                type="button"
                className="file-btn file-btn--primary"
                onClick={() => onApply(best.params)}
              >
                Apply best to model
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
