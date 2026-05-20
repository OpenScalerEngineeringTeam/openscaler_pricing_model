import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { CostBreakdown } from './components/CostBreakdown';
import { ParamsPanel } from './components/ParamsPanel';
import { OptimizerPanel } from './components/OptimizerPanel';
import { Toolbar, type AppView } from './components/Toolbar';
import { VmPricingCard } from './components/VmPricingCard';
import { applyConfigDocument, buildConfigDocument, saveConfigToFile } from './lib/config';
import { compute } from './lib/compute';
import { DEFAULT_PARAMS, DEFAULT_PLANS } from './lib/constants';
import { loadPlansFromJson } from './lib/plans';
import type { ModelParams, Plan, PriceDisplay, Scenario } from './types';

export default function App() {
  const [params, setParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [scenario, setScenario] = useState<Scenario>('p2');
  const [priceDisplay, setPriceDisplay] = useState<PriceDisplay>('usd');
  const [activeParamTab, setActiveParamTab] = useState('fx');
  const [hwFromComponents, setHwFromComponents] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeView, setActiveView] = useState<AppView>('model');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computed = useMemo(() => compute(params, scenario, hwFromComponents), [params, scenario, hwFromComponents]);

  useEffect(() => {
    loadPlansFromJson().then((loaded) => {
      if (loaded) setPlans(loaded);
    });
  }, []);

  const flashSave = useCallback((msg: string) => {
    setSaveStatus(msg);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveStatus(''), 2200);
  }, []);

  const handleSave = useCallback(async () => {
    const json = JSON.stringify(buildConfigDocument(params, scenario, priceDisplay, activeParamTab, hwFromComponents), null, 2);
    await saveConfigToFile(json);
    flashSave('Saved');
  }, [params, scenario, priceDisplay, activeParamTab, hwFromComponents, flashSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleSave]);

  const handleLoad = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const ui = applyConfigDocument(data, setParams);
          if (ui.scenario) setScenario(ui.scenario);
          if (ui.priceDisplay) setPriceDisplay(ui.priceDisplay);
          if (ui.activeParamTab) setActiveParamTab(ui.activeParamTab);
          if (ui.hwFromComponents !== undefined) setHwFromComponents(ui.hwFromComponents);
        } catch (err) {
          alert(`Could not load config: ${(err as Error).message || String(err)}`);
        }
      };
      reader.onerror = () => alert('Could not read the selected file.');
      reader.readAsText(file);
    },
    [],
  );

  const setParam = useCallback((key: keyof ModelParams, value: number) => {
    setParams((p) => ({ ...p, [key]: value }));
  }, []);

  return (
    <div className="app-wrap">
      <h2 className="sr-only">OpenScaler cloud cost estimator — monthly per-server cost breakdown and VM pricing model</h2>
      <Toolbar
        activeView={activeView}
        scenario={scenario}
        priceDisplay={priceDisplay}
        saveStatus={saveStatus}
        onView={setActiveView}
        onScenario={setScenario}
        onPriceDisplay={setPriceDisplay}
        onSave={handleSave}
        onLoad={handleLoad}
      />
      {activeView === 'optimizer' ? (
        <OptimizerPanel
          params={params}
          scenario={scenario}
          hwFromComponents={hwFromComponents}
          onApply={(next) => {
            setParams(next);
            setActiveView('model');
          }}
          onBack={() => setActiveView('model')}
        />
      ) : (
        <div className="two-col">
          <div className="card">
            <div className="section-title">Cost breakdown / server / month</div>
            <CostBreakdown computed={computed} />
            <ParamsPanel
              params={params}
              scenario={scenario}
              activeTab={activeParamTab}
              hwFromComponents={hwFromComponents}
              onHwFromComponents={(enabled) => {
                setHwFromComponents(enabled);
                if (enabled) setActiveParamTab('hw_components');
              }}
              onTab={setActiveParamTab}
              onParam={setParam}
            />
          </div>
          <VmPricingCard plans={plans} params={params} computed={computed} priceDisplay={priceDisplay} />
        </div>
      )}
    </div>
  );
}
