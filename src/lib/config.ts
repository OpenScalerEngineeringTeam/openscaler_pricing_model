import { getControlGroups } from './controlGroups';
import { compute } from './compute';
import { listedDzd, planBreakEvenDzd } from './pricing';
import type { ModelParams, Plan, PriceDisplay, Scenario } from '../types';

export const CONFIG_FORMAT = 'openscaler-cost-model';
export const CONFIG_VERSION = 1;

const SCENARIO_LABELS: Record<Scenario, string> = {
  p1: 'Phase 1 — AT hardware (fixed 2M DZD landed cost, 36 mo amort cap)',
  p2: 'Phase 2 — self-assembled (BOM USD + import overhead, full amortization)',
};

const HIDDEN_PARAMS: Record<string, { label: string; unit: string; group: string; description: string }> = {
  power_dzd_kwh: { label: 'Electricity rate', unit: 'DZD/kWh', group: 'Fixed constants (not in UI sliders)', description: 'Algeria subsidized commercial rate used for monthly power per server (server_w × PUE × 720h).' },
  rack_u: { label: 'Rack units per server', unit: 'U', group: 'Fixed constants (not in UI sliders)', description: 'Physical rack height assumed per host when splitting colocation cost (monthly_rack = rack_per_u_dzd × rack_u).' },
};

function buildParameterExport(params: ModelParams, scenario: Scenario) {
  const out: Record<string, object> = {};
  for (const g of getControlGroups(scenario)) {
    for (const f of g.fields) {
      out[f.key] = {
        value: params[f.key],
        label: f.label,
        unit: f.unit || null,
        group: g.title,
        group_description: g.desc,
        description: f.tip || null,
        editable_in_ui: true,
      };
    }
  }
  for (const [key, info] of Object.entries(HIDDEN_PARAMS)) {
    if (!(key in out) && key in params) {
      out[key] = { value: params[key as keyof ModelParams], label: info.label, unit: info.unit, group: info.group, description: info.description, editable_in_ui: false };
    }
  }
  return out;
}

function buildComputedSnapshot(params: ModelParams, scenario: Scenario, plans: Plan[]) {
  const C = compute(params, scenario);
  const usd = params.usd_dzd;
  const refPlan = { memory: params.avg_vm_ram, vcpus: params.avg_vm_vcpu, disk: params.avg_vm_disk_gb, transfer: params.avg_vm_transfer_tb };
  const refBeDzd = planBreakEvenDzd(refPlan, params, C);
  const refTargetDzd = refBeDzd / (1 - params.margin);
  return {
    currency_note: 'Internal model runs in DZD; USD figures use parameters.usd_dzd.value.',
    cost_per_server_month_dzd: Math.round(C.total),
    cost_breakdown_dzd: {
      hardware: Math.round(C.monthly_hw),
      power: Math.round(C.monthly_power),
      rack: Math.round(C.monthly_rack),
      transit_bandwidth: Math.round(C.monthly_bw),
      storage_nvme: Math.round(C.monthly_storage),
      team_ops: Math.round(C.monthly_team),
      misc: Math.round(C.monthly_misc),
    },
    capacity: {
      sellable_vm_slots: C.sellable_vms,
      paying_vms_at_utilization: Math.round(C.paying_vms),
      utilization_pct: Math.round(params.utilization * 100),
      binding_constraint: C.binding,
      sellable_by_ram: Math.round(C.sellable_by_ram * 10) / 10,
      sellable_by_cpu: Math.round(C.sellable_by_cpu * 10) / 10,
      sellable_by_disk: Math.round(C.sellable_by_disk * 10) / 10,
    },
    reference_vm: {
      spec: `${params.avg_vm_ram} GiB RAM · ${params.avg_vm_vcpu} vCPU · ${params.avg_vm_disk_gb} GB disk · ${params.avg_vm_transfer_tb} TB transfer`,
      break_even_dzd: Math.round(refBeDzd),
      break_even_usd: Math.round((refBeDzd / usd) * 100) / 100,
      target_price_dzd: Math.round(refTargetDzd),
      target_price_usd: Math.round((refTargetDzd / usd) * 100) / 100,
      target_margin_pct: Math.round(params.margin * 100),
    },
    catalog_summary: {
      plan_count: plans.length,
      plans_above_target: plans.filter((pl) => listedDzd(pl, usd) >= planBreakEvenDzd(pl, params, C) / (1 - params.margin)).length,
      plans_below_target: plans.filter((pl) => listedDzd(pl, usd) < planBreakEvenDzd(pl, params, C) / (1 - params.margin)).length,
    },
  };
}

export function buildConfigDocument(
  params: ModelParams,
  scenario: Scenario,
  priceDisplay: PriceDisplay,
  activeParamTab: string,
  plans: Plan[],
) {
  return {
    _meta: {
      format: CONFIG_FORMAT,
      format_version: CONFIG_VERSION,
      saved_at: new Date().toISOString(),
      tool: 'OpenScaler cloud cost estimator',
      source_file: 'web (Vite)',
      purpose: 'Saved snapshot of model inputs and VM catalog for OpenScaler pricing analysis.',
    },
    ui: { scenario, scenario_label: SCENARIO_LABELS[scenario], price_display: priceDisplay, active_param_tab: activeParamTab },
    parameters: buildParameterExport(params, scenario),
    catalog: {
      note: 'Plans used in "VM pricing vs catalog". monthly_usd is the listed retail price; break-even/target are computed from parameters.',
      plans: plans.map((pl) => ({
        id: pl.id,
        name: pl.name,
        vcpus: pl.vcpus,
        memory_gib: pl.memory,
        disk_gb: pl.disk,
        transfer_tb: pl.transfer,
        units: pl.units,
        listed_monthly_usd: pl.monthly_usd,
        listed_monthly_dzd: Math.round(pl.monthly_usd * params.usd_dzd * 100) / 100,
      })),
    },
    computed_snapshot: buildComputedSnapshot(params, scenario, plans),
  };
}

export function applyConfigDocument(
  data: unknown,
  setParams: (fn: (prev: ModelParams) => ModelParams) => void,
  setPlans: (p: Plan[]) => void,
): { scenario?: Scenario; priceDisplay?: PriceDisplay; activeParamTab?: string } {
  const doc = data as Record<string, unknown>;
  if (!doc || (doc._meta as { format?: string })?.format !== CONFIG_FORMAT) {
    throw new Error('Not a valid OpenScaler cost model config (missing or unknown format).');
  }
  if ((doc._meta as { format_version?: number })?.format_version! > CONFIG_VERSION) {
    throw new Error('Config was saved with a newer format version — update the app.');
  }

  setParams((prev) => {
    const next = { ...prev };
    const paramEntries = doc.parameters as Record<string, { value?: number }> | undefined;
    if (paramEntries && typeof paramEntries === 'object') {
      for (const [key, entry] of Object.entries(paramEntries)) {
        const val = entry?.value;
        if (key in next && typeof val === 'number' && !Number.isNaN(val)) {
          (next as Record<string, number>)[key] = val;
        }
      }
    } else if (doc.P && typeof doc.P === 'object') {
      for (const [key, val] of Object.entries(doc.P as Record<string, number>)) {
        if (key in next && typeof val === 'number') (next as Record<string, number>)[key] = val;
      }
    }
    return next;
  });

  const catalogPlans = (doc.catalog as { plans?: unknown[] })?.plans ?? doc.plans;
  if (Array.isArray(catalogPlans) && catalogPlans.length) {
    setPlans(
      catalogPlans.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        memory: (p.memory_gib ?? p.memory) as number,
        vcpus: p.vcpus as number,
        disk: (p.disk_gb ?? p.disk) as number,
        transfer: (p.transfer_tb ?? p.transfer) as number,
        units: p.units as number,
        monthly_usd: (p.listed_monthly_usd ?? p.monthly_usd ?? parseFloat(String(p.price_monthly))) as number,
      })),
    );
  }

  const ui = doc.ui as { scenario?: Scenario; price_display?: PriceDisplay; active_param_tab?: string } | undefined;
  return {
    scenario: ui?.scenario === 'p1' || ui?.scenario === 'p2' ? ui.scenario : undefined,
    priceDisplay: ui?.price_display === 'usd' || ui?.price_display === 'dzd' ? ui.price_display : undefined,
    activeParamTab: ui?.active_param_tab,
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
