import { useCallback, useMemo, useRef, useState } from 'react';
import { getVisibleControlFields } from '../lib/paramBounds';
import {
  OBJECTIVE_LABELS,
  evaluateObjective,
  type ObjectiveConstraints,
  type ObjectiveId,
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

const OBJECTIVE_IDS = Object.keys(OBJECTIVE_LABELS) as ObjectiveId[];

function defaultPins(fields: { key: keyof ModelParams }[]): PinState {
  const pins: PinState = {};
  for (const f of fields) pins[f.key] = true;
  return pins;
}

export function OptimizerPanel({
  params,
  scenario,
  hwFromComponents,
  onApply,
  onBack,
}: OptimizerPanelProps) {
  const fields = useMemo(
    () => getVisibleControlFields(scenario, hwFromComponents),
    [scenario, hwFromComponents],
  );
  const searchableKeys = useMemo(() => fields.map((f) => f.key), [fields]);

  const [pins, setPins] = useState<PinState>(() => defaultPins(fields));
  const [objectiveId, setObjectiveId] = useState<ObjectiveId>('maxFleetProfit');
  const [profitFloorDzd, setProfitFloorDzd] = useState('');
  const [refTargetUsdCap, setRefTargetUsdCap] = useState('12');
  const [maxCpuOversub, setMaxCpuOversub] = useState('');
  const [maxRamOversub, setMaxRamOversub] = useState('');
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

  const constraints = useMemo((): ObjectiveConstraints => {
    const c: ObjectiveConstraints = {};
    const floor = parseFloat(profitFloorDzd);
    if (!Number.isNaN(floor) && profitFloorDzd.trim() !== '') c.profitFloorDzd = floor;
    const cap = parseFloat(refTargetUsdCap);
    if (!Number.isNaN(cap) && refTargetUsdCap.trim() !== '') c.refTargetUsdCap = cap;
    const cpu = parseFloat(maxCpuOversub);
    if (!Number.isNaN(cpu) && maxCpuOversub.trim() !== '') c.maxCpuOversub = cpu;
    const ram = parseFloat(maxRamOversub);
    if (!Number.isNaN(ram) && maxRamOversub.trim() !== '') c.maxRamOversub = ram;
    return c;
  }, [profitFloorDzd, refTargetUsdCap, maxCpuOversub, maxRamOversub]);

  const baselineEv = useMemo(
    () => evaluateObjective(params, objectiveId, constraints, scenario, hwFromComponents),
    [params, objectiveId, constraints, scenario, hwFromComponents],
  );

  const togglePin = useCallback((key: keyof ModelParams) => {
    setPins((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const pinAll = useCallback(() => setPins(defaultPins(fields)), [fields]);
  const unpinAll = useCallback(() => {
    const next: PinState = {};
    for (const f of fields) next[f.key] = false;
    setPins(next);
  }, [fields]);

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
          objectiveId,
          constraints,
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
  }, [freeKeys, params, objectiveId, constraints, scenario, hwFromComponents, samples, seed]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
  }, []);

  const best = result?.top[0];

  return (
    <div className="optimizer-panel">
      <div className="optimizer-header">
        <div>
          <h3 className="optimizer-title">Parameter optimizer</h3>
          <p className="optimizer-desc">
            Pin parameters to hold them fixed; unpin parameters the search may adjust within slider bounds.
          </p>
        </div>
        <button type="button" className="file-btn" onClick={onBack}>
          Back to model
        </button>
      </div>

      <div className="optimizer-grid">
        <section className="card optimizer-section">
          <div className="section-title">Objective</div>
          <label className="optimizer-field">
            <span>Preset</span>
            <select
              value={objectiveId}
              onChange={(e) => setObjectiveId(e.target.value as ObjectiveId)}
              disabled={running}
            >
              {OBJECTIVE_IDS.map((id) => (
                <option key={id} value={id}>
                  {OBJECTIVE_LABELS[id]}
                </option>
              ))}
            </select>
          </label>

          {(objectiveId === 'minRefTargetPrice' || objectiveId === 'minCostPerPayingVm') && (
            <label className="optimizer-field">
              <span>Min fleet profit (DZD/mo)</span>
              <input
                type="number"
                min={0}
                placeholder={objectiveId === 'minCostPerPayingVm' ? 'optional' : 'required'}
                value={profitFloorDzd}
                onChange={(e) => setProfitFloorDzd(e.target.value)}
                disabled={running}
              />
            </label>
          )}

          {objectiveId === 'maxFleetProfitUnderPriceCap' && (
            <label className="optimizer-field">
              <span>Max reference target ($/mo)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={refTargetUsdCap}
                onChange={(e) => setRefTargetUsdCap(e.target.value)}
                disabled={running}
              />
            </label>
          )}

          <div className="optimizer-risk-caps">
            <div className="param-group-desc">Optional risk caps (leave empty to ignore)</div>
            <label className="optimizer-field">
              <span>Max CPU oversub</span>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                placeholder="—"
                value={maxCpuOversub}
                onChange={(e) => setMaxCpuOversub(e.target.value)}
                disabled={running}
              />
            </label>
            <label className="optimizer-field">
              <span>Max RAM oversub</span>
              <input
                type="number"
                min={1}
                max={2}
                step={0.05}
                placeholder="—"
                value={maxRamOversub}
                onChange={(e) => setMaxRamOversub(e.target.value)}
                disabled={running}
              />
            </label>
          </div>

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
                  checked={pins[f.key] !== false}
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
            <div className="metric-label">Fleet profit / mo</div>
            <div className="metric-value">{fmt(baselineEv.metrics.fleetProfitDzd)} DZD</div>
          </div>
          <div className="metric">
            <div className="metric-label">Ref target</div>
            <div className="metric-value">${baselineEv.metrics.refTargetUsd.toFixed(2)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Cost / paying VM</div>
            <div className="metric-value">{fmt(baselineEv.metrics.costPerPayingVm)} DZD</div>
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
                  <th>Fleet profit</th>
                  <th>Ref target $</th>
                  <th>Cost/VM</th>
                  <th>Paying/host</th>
                  <th>Binding</th>
                  <th>Changed</th>
                </tr>
              </thead>
              <tbody>
                {result.top.map((row, i) => {
                  const changed = freeKeys
                    .filter((k) => row.params[k] !== params[k])
                    .map((k) => fields.find((f) => f.key === k)?.label ?? k);
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{row.score === Number.NEGATIVE_INFINITY ? '—' : row.score.toFixed(2)}</td>
                      <td>{fmt(row.metrics.fleetProfitDzd)}</td>
                      <td>${row.metrics.refTargetUsd.toFixed(2)}</td>
                      <td>{fmt(row.metrics.costPerPayingVm)}</td>
                      <td>{row.metrics.payingVms.toFixed(1)}</td>
                      <td>{row.metrics.binding}</td>
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
