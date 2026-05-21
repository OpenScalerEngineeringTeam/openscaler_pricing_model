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
import {
  initialOptimizerSession,
  mergeOptimizerPins,
  writeOptimizerSession,
  type OptimizerSessionState,
} from './lib/optimizerState';
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
  const [optimizer, setOptimizer] = useState<OptimizerSessionState>(() => initialOptimizerSession('p2', false));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    writeOptimizerSession(optimizer);
  }, [optimizer]);

  const setScenarioAndPins = useCallback((s: Scenario) => {
    setScenario(s);
    setOptimizer((o) => ({ ...o, pins: mergeOptimizerPins(s, hwFromComponents, o.pins) }));
  }, [hwFromComponents]);

  const setHwFromComponentsAndPins = useCallback((enabled: boolean) => {
    setHwFromComponents(enabled);
    setOptimizer((o) => ({ ...o, pins: mergeOptimizerPins(scenario, enabled, o.pins) }));
    if (enabled) setActiveParamTab('hw_components');
  }, [scenario]);

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
    const json = JSON.stringify(
      buildConfigDocument(
        params,
        scenario,
        priceDisplay,
        activeParamTab,
        hwFromComponents,
        optimizer,
      ),
      null,
      2,
    );
    await saveConfigToFile(json);
    flashSave('Saved');
  }, [params, scenario, priceDisplay, activeParamTab, hwFromComponents, optimizer, flashSave]);

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
          const loadedScenario = ui.scenario ?? 'p2';
          const loadedHw = ui.hwFromComponents ?? false;
          if (ui.scenario) setScenario(ui.scenario);
          if (ui.priceDisplay) setPriceDisplay(ui.priceDisplay);
          if (ui.activeParamTab) setActiveParamTab(ui.activeParamTab);
          if (ui.hwFromComponents !== undefined) setHwFromComponents(ui.hwFromComponents);
          setOptimizer((prev) => ({
            pins: mergeOptimizerPins(loadedScenario, loadedHw, ui.optimizer?.pins ?? prev.pins),
            weights: ui.optimizer?.weights ?? prev.weights,
            samples: ui.optimizer?.samples ?? prev.samples,
            seed: ui.optimizer?.seed ?? prev.seed,
          }));
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
        onScenario={setScenarioAndPins}
        onPriceDisplay={setPriceDisplay}
        onSave={handleSave}
        onLoad={handleLoad}
      />
      {activeView === 'optimizer' ? (
        <OptimizerPanel
          params={params}
          scenario={scenario}
          hwFromComponents={hwFromComponents}
          pins={optimizer.pins}
          weights={optimizer.weights}
          samples={optimizer.samples}
          seed={optimizer.seed}
          onPins={(pins) => setOptimizer((o) => ({ ...o, pins }))}
          onWeights={(weights) => setOptimizer((o) => ({ ...o, weights }))}
          onSamples={(samples) => setOptimizer((o) => ({ ...o, samples }))}
          onSeed={(seed) => setOptimizer((o) => ({ ...o, seed }))}
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
            <CostBreakdown params={params} computed={computed} priceDisplay={priceDisplay} />
            <ParamsPanel
              params={params}
              scenario={scenario}
              activeTab={activeParamTab}
              hwFromComponents={hwFromComponents}
              onHwFromComponents={setHwFromComponentsAndPins}
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
