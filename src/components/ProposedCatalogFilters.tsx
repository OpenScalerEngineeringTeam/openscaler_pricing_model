import type { CatalogFilters, DuplicatePriceStrategy } from '../types';
import { DEFAULT_CATALOG_FILTERS } from '../types';

const DUPLICATE_PRICE_OPTIONS: { value: DuplicatePriceStrategy; label: string; hint: string }[] = [
  {
    value: 'collapse',
    label: 'Collapse same price',
    hint: 'Keep the best spec when rounding yields one retail price (recommended).',
  },
  {
    value: 'bump',
    label: 'One SKU per size + stair-step',
    hint: 'Keep the best profile per size (units), then nudge prices so each size is strictly more expensive than the last.',
  },
  {
    value: 'show',
    label: 'Show all',
    hint: 'List every profile; same retail price may appear on multiple specs.',
  },
];

interface ProposedCatalogFiltersProps {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
}

export function ProposedCatalogFilters({ filters, onChange }: ProposedCatalogFiltersProps) {
  const setField = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange(DEFAULT_CATALOG_FILTERS);
  };

  return (
    <details className="catalog-filters">
      <summary className="catalog-filters-summary">Filters</summary>
      <div className="catalog-filters-body">
        <div className="catalog-filters-grid">
          <label className="filter-field">
            <span>Max rows</span>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={filters.maxRows}
              onChange={(e) => setField('maxRows', Number(e.target.value))}
            />
            <span className="filter-val">{filters.maxRows}</span>
          </label>
          <label className="filter-field">
            <span>Min fit (VMs/host)</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={filters.minFit}
              onChange={(e) => setField('minFit', Number(e.target.value))}
            />
            <span className="filter-val">{filters.minFit}</span>
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
                checked={filters.profiles[key]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    profiles: { ...filters.profiles, [key]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <fieldset className="filter-duplicate-price">
          <legend className="filter-profiles-label">Same retail price</legend>
          {DUPLICATE_PRICE_OPTIONS.map(({ value, label, hint }) => (
            <label key={value} className="filter-radio" title={hint}>
              <input
                type="radio"
                name="duplicatePriceStrategy"
                checked={filters.duplicatePriceStrategy === value}
                onChange={() => setField('duplicatePriceStrategy', value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="catalog-filters-actions">
          <button type="button" className="file-btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </details>
  );
}
