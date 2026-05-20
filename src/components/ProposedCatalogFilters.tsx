import { useState } from 'react';
import type { CatalogFilters, PricingStrategy } from '../types';
import { DEFAULT_CATALOG_FILTERS } from '../types';

interface ProposedCatalogFiltersProps {
  strategy: PricingStrategy;
  onStrategy: (s: PricingStrategy) => void;
  applied: CatalogFilters;
  onApply: (f: CatalogFilters) => void;
}

export function ProposedCatalogFilters({
  strategy,
  onStrategy,
  applied,
  onApply,
}: ProposedCatalogFiltersProps) {
  const [draft, setDraft] = useState<CatalogFilters>(applied);

  const setDraftField = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleApply = () => {
    onApply({ ...draft, strategy });
    onStrategy(strategy);
  };

  const handleReset = () => {
    const reset = { ...DEFAULT_CATALOG_FILTERS, strategy };
    setDraft(reset);
    onApply(reset);
  };

  return (
    <details className="catalog-filters">
      <summary className="catalog-filters-summary">Filters</summary>
      <div className="catalog-filters-body">
        <div className="catalog-filters-grid">
          <label className="filter-field">
            <span>Max vCPUs</span>
            <input
              type="range"
              min={1}
              max={32}
              step={1}
              value={draft.maxVcpus}
              onChange={(e) => setDraftField('maxVcpus', Number(e.target.value))}
            />
            <span className="filter-val">{draft.maxVcpus}</span>
          </label>
          <label className="filter-field">
            <span>Max RAM (GiB)</span>
            <input
              type="range"
              min={1}
              max={128}
              step={1}
              value={draft.maxRam}
              onChange={(e) => setDraftField('maxRam', Number(e.target.value))}
            />
            <span className="filter-val">{draft.maxRam}</span>
          </label>
          <label className="filter-field">
            <span>Max rows</span>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={draft.maxRows}
              onChange={(e) => setDraftField('maxRows', Number(e.target.value))}
            />
            <span className="filter-val">{draft.maxRows}</span>
          </label>
          <label className="filter-field">
            <span>Min fit (VMs/host)</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={draft.minFit}
              onChange={(e) => setDraftField('minFit', Number(e.target.value))}
            />
            <span className="filter-val">{draft.minFit}</span>
          </label>
        </div>
        <div className="filter-profiles">
          <span className="filter-profiles-label">Profiles</span>
          {(
            [
              ['shared', 'Shared entry (1 vCPU)'],
              ['balanced', 'Balanced (1–2 GiB/vCPU)'],
              ['general', 'General (4 GiB/vCPU)'],
              ['memory', 'Memory (8 GiB/vCPU)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="filter-check">
              <input
                type="checkbox"
                checked={draft.profiles[key]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    profiles: { ...d.profiles, [key]: e.target.checked },
                  }))
                }
              />
              {label}
            </label>
          ))}
          <label className="filter-check">
            <input
              type="checkbox"
              checked={draft.hideDuplicates}
              onChange={(e) => setDraftField('hideDuplicates', e.target.checked)}
            />
            Hide duplicate vCPU/RAM pairs
          </label>
        </div>
        <div className="catalog-filters-actions">
          <button type="button" className="file-btn file-btn--primary" onClick={handleApply}>
            Apply
          </button>
          <button type="button" className="file-btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </details>
  );
}

export function PricingStrategySelect({
  value,
  onChange,
}: {
  value: PricingStrategy;
  onChange: (s: PricingStrategy) => void;
}) {
  return (
    <label className="strategy-select">
      <span>Strategy</span>
      <select value={value} onChange={(e) => onChange(e.target.value as PricingStrategy)}>
        <option value="balanced">Balanced</option>
        <option value="aggressive">Aggressive</option>
        <option value="premium">Premium</option>
      </select>
    </label>
  );
}
