import { getControlGroups } from '../lib/controlGroups';
import { fmt } from '../lib/pricing';
import type { ControlField, ModelParams, Scenario } from '../types';

interface ParamsPanelProps {
  params: ModelParams;
  scenario: Scenario;
  activeTab: string;
  onTab: (id: string) => void;
  onParam: (key: keyof ModelParams, value: number) => void;
}

function ParamField({ field, value, onChange }: { field: ControlField; value: number; onChange: (v: number) => void }) {
  let display = field.fmt ? field.fmt(value) : fmt(value);
  if (field.unit === '$') display = `$${display}`;
  else if (field.unit) display = `${display} ${field.unit}`;

  return (
    <div className="param-row">
      <label className="param-label" htmlFor={`sl-${field.key}`}>
        <span className="param-label-text">
          <span>{field.label}</span>
          {field.tip && (
            <span className="tip-wrap">
              <button type="button" className="tip-btn" aria-label="Help">
                ?
              </button>
              <span className="tip-popup" role="tooltip">
                {field.tip}
              </span>
            </span>
          )}
        </span>
        <span className="param-val">{display}</span>
      </label>
      <input
        type="range"
        id={`sl-${field.key}`}
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        aria-label={field.label}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}

export function ParamsPanel({ params, scenario, activeTab, onTab, onParam }: ParamsPanelProps) {
  const groups = getControlGroups(scenario).filter((g) => !g.show || g.show());
  const tab = groups.some((g) => g.id === activeTab) ? activeTab : groups[0]?.id ?? 'fx';
  const active = groups.find((g) => g.id === tab) ?? groups[0];

  return (
    <div className="params-tabs-section">
      <div className="section-title" style={{ marginBottom: '.5rem' }}>
        Model parameters
      </div>
      <div className="params-tabs" role="tablist" aria-label="Model parameter categories">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`param-tab${g.id === tab ? ' active' : ''}`}
            role="tab"
            aria-selected={g.id === tab}
            aria-controls="controls"
            id={`tab-${g.id}`}
            onClick={() => onTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      <div className="params-panel" id="controls" role="tabpanel" aria-labelledby={active ? `tab-${active.id}` : undefined}>
        {active && (
          <section className="param-group" aria-labelledby={`grp-${active.id}`}>
            <div className="param-group-title" id={`grp-${active.id}`}>
              {active.title}
            </div>
            <div className="param-group-desc">{active.desc}</div>
            <div className="param-group-fields">
              {active.fields.map((f) => (
                <ParamField key={f.key} field={f} value={params[f.key]} onChange={(v) => onParam(f.key, v)} />
              ))}
            </div>
          </section>
        )}
      </div>
      <p className="params-footnote">
        Hover the{' '}
        <span className="tip-btn" style={{ cursor: 'default', verticalAlign: 'middle' }}>
          ?
        </span>{' '}
        on each field for a short explanation.
      </p>
    </div>
  );
}
