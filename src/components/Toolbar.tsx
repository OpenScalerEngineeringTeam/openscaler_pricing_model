import type { PriceDisplay, Scenario } from '../types';

interface ToolbarProps {
  scenario: Scenario;
  priceDisplay: PriceDisplay;
  saveStatus: string;
  onScenario: (s: Scenario) => void;
  onPriceDisplay: (p: PriceDisplay) => void;
  onSave: () => void;
  onLoad: (file: File) => void;
}

export function Toolbar({ scenario, priceDisplay, saveStatus, onScenario, onPriceDisplay, onSave, onLoad }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="scenario-toggle">
        <button type="button" className={`sc-btn${scenario === 'p2' ? ' active' : ''}`} onClick={() => onScenario('p2')}>
          Phase 2 — self-assembled
        </button>
        <button type="button" className={`sc-btn${scenario === 'p1' ? ' active' : ''}`} onClick={() => onScenario('p1')}>
          Phase 1 — AT hardware
        </button>
      </div>
      <div className="toolbar-actions">
        <div className="price-display-wrap">
          <label htmlFor="price-display">Price display</label>
          <select id="price-display" value={priceDisplay} onChange={(e) => onPriceDisplay(e.target.value as PriceDisplay)}>
            <option value="usd">USD</option>
            <option value="dzd">DZD</option>
          </select>
        </div>
        <button type="button" className="file-btn file-btn--primary" onClick={onSave} title="Save config (Ctrl+S)">
          Save config…
        </button>
        <button type="button" className="file-btn" onClick={() => document.getElementById('config-file-input')?.click()} title="Load config">
          Load config…
        </button>
        <input
          type="file"
          id="config-file-input"
          className="file-input-hidden"
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onLoad(file);
          }}
        />
        <span className={`save-status${saveStatus ? ' visible' : ''}`} aria-live="polite">
          {saveStatus}
        </span>
      </div>
    </div>
  );
}
