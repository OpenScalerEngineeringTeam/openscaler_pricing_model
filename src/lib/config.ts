import {
  buildOptimizerConfigSection,
  optimizerFromConfigSection,
  type OptimizerSessionState,
} from './optimizerState';
import type { ModelParams, PriceDisplay, Scenario } from '../types';

export const CONFIG_FORMAT = 'openscaler-cost-model';
export const CONFIG_VERSION = 5;

export interface PricingUiState {
  freezePrices: boolean;
  freezeUtilization: number;
}

export function buildConfigDocument(
  params: ModelParams,
  scenario: Scenario,
  priceDisplay: PriceDisplay,
  activeParamTab: string,
  hwFromComponents: boolean,
  optimizer?: OptimizerSessionState,
  pricingUi?: PricingUiState,
) {
  return {
    _meta: {
      format: CONFIG_FORMAT,
      format_version: CONFIG_VERSION,
      saved_at: new Date().toISOString(),
    },
    ui: {
      scenario,
      price_display: priceDisplay,
      active_param_tab: activeParamTab,
      hw_from_components: hwFromComponents,
      ...(pricingUi
        ? {
            freeze_prices: pricingUi.freezePrices,
            freeze_utilization: pricingUi.freezeUtilization,
          }
        : {}),
    },
    parameters: { ...params },
    ...(optimizer ? { optimizer: buildOptimizerConfigSection(optimizer) } : {}),
  };
}

function readParameterValue(entry: unknown): number | undefined {
  if (typeof entry === 'number' && !Number.isNaN(entry)) return entry;
  if (entry && typeof entry === 'object' && 'value' in entry) {
    const val = (entry as { value?: unknown }).value;
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
  }
  return undefined;
}

export function applyConfigDocument(
  data: unknown,
  setParams: (fn: (prev: ModelParams) => ModelParams) => void,
): {
  scenario?: Scenario;
  priceDisplay?: PriceDisplay;
  activeParamTab?: string;
  hwFromComponents?: boolean;
  freezePrices?: boolean;
  freezeUtilization?: number;
  optimizer?: Partial<OptimizerSessionState>;
} {
  const doc = data as Record<string, unknown>;
  if (!doc || (doc._meta as { format?: string })?.format !== CONFIG_FORMAT) {
    throw new Error('Not a valid OpenScaler cost model config (missing or unknown format).');
  }
  const version = (doc._meta as { format_version?: number })?.format_version ?? 1;
  if (version > CONFIG_VERSION) {
    throw new Error('Config was saved with a newer format version — update the app.');
  }

  setParams((prev) => {
    const next = { ...prev };
    const paramEntries = doc.parameters as Record<string, unknown> | undefined;
    if (paramEntries && typeof paramEntries === 'object') {
      for (const [key, entry] of Object.entries(paramEntries)) {
        const val = readParameterValue(entry);
        if (key in next && val !== undefined) {
          (next as Record<string, number>)[key] = val;
        }
      }
    } else if (doc.P && typeof doc.P === 'object') {
      for (const [key, val] of Object.entries(doc.P as Record<string, unknown>)) {
        const n = readParameterValue(val);
        if (key in next && n !== undefined) (next as Record<string, number>)[key] = n;
      }
    }
    return next;
  });

  const ui = doc.ui as {
    scenario?: Scenario;
    price_display?: PriceDisplay;
    active_param_tab?: string;
    hw_from_components?: boolean;
    freeze_prices?: boolean;
    freeze_utilization?: number;
  } | undefined;
  const scenario = ui?.scenario === 'p1' || ui?.scenario === 'p2' ? ui.scenario : undefined;
  const hwFromComponents =
    ui?.hw_from_components === true ? true : ui?.hw_from_components === false ? false : undefined;
  const optimizer = optimizerFromConfigSection(doc.optimizer, scenario ?? 'p2', hwFromComponents ?? false);
  const freezeUtil = ui?.freeze_utilization;
  return {
    scenario,
    priceDisplay: ui?.price_display === 'usd' || ui?.price_display === 'dzd' ? ui.price_display : undefined,
    activeParamTab: ui?.active_param_tab,
    hwFromComponents,
    freezePrices: ui?.freeze_prices === true ? true : ui?.freeze_prices === false ? false : undefined,
    freezeUtilization:
      typeof freezeUtil === 'number' && !Number.isNaN(freezeUtil) && freezeUtil > 0 && freezeUtil <= 1
        ? freezeUtil
        : undefined,
    optimizer: optimizer ?? undefined,
  };
}

export async function saveConfigToFile(json: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  const types = [{ description: 'OpenScaler cost model', accept: { 'application/json': ['.json'] } }];
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as Window & { showSaveFilePicker: (o: object) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: `openscaler-cost-model-${stamp}.json`,
        types,
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `openscaler-cost-model-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
