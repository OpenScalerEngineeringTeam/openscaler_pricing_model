import { frozenPlanTargetDzd } from './frozenPricing';
import { planBreakEvenDzd } from './pricing';
import { priceStep, roundNiceUsd } from './nicePricing';
import { canonicalUnits, maxPerServer, planFit } from './slotCapacity';
import type {
  CatalogFilters,
  ComputeResult,
  DuplicatePriceStrategy,
  ModelParams,
  ProposedPlan,
} from '../types';

const VCPU_OPTIONS = [1, 2, 4, 8, 16, 32];
const RAM_OPTIONS = [0.5, 1, 2, 4, 8, 16, 32, 64, 128];

function roundUp10(n: number): number {
  return Math.ceil(n / 10) * 10;
}

function roundHalf(n: number): number {
  return Math.max(0.5, Math.round(n * 2) / 2);
}

function deriveDiskGb(memory: number, maxFit: number, P: ModelParams): number {
  const ideal = roundUp10(10 + 15 * memory);
  const capPerVm = Math.floor((P.nvme_tb_per_server * 1024) / Math.max(4, maxFit));
  return Math.min(ideal, Math.max(10, capPerVm));
}

interface Candidate {
  vcpus: number;
  memory: number;
}

function buildCandidates(filters: CatalogFilters): Candidate[] {
  const vcpus = VCPU_OPTIONS.filter((v) => v <= filters.maxVcpus);
  const rams = RAM_OPTIONS.filter((r) => r <= filters.maxRam);
  const seen = new Set<string>();
  const out: Candidate[] = [];

  const add = (vcpu: number, ram: number) => {
    if (ram > filters.maxRam || vcpu > filters.maxVcpus) return;
    const key = `${vcpu}-${ram}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ vcpus: vcpu, memory: ram });
  };

  if (filters.profiles.shared) {
    for (const ram of [0.5, 1, 2]) add(1, ram);
  }
  if (filters.profiles.balanced) {
    for (const v of vcpus) {
      for (const ratio of [1, 2]) {
        const ram = v * ratio;
        if (rams.includes(ram) || ram <= filters.maxRam) add(v, ram);
      }
    }
  }
  if (filters.profiles.general) {
    for (const v of vcpus.filter((x) => x >= 2)) {
      const ram = v * 4;
      add(v, ram);
    }
  }
  if (filters.profiles.memory) {
    for (const v of vcpus.filter((x) => x >= 2)) {
      const ram = Math.min(v * 8, filters.maxRam);
      add(v, ram);
    }
  }

  return out;
}

/** True when a is strictly better value than b at the same rounded retail price. */
export function isBetterSpec(a: ProposedPlan, b: ProposedPlan): boolean {
  if (a.units !== b.units) return a.units > b.units;
  if (a.vcpus !== b.vcpus) return a.vcpus > b.vcpus;
  if (a.memory !== b.memory) return a.memory > b.memory;
  return a.disk > b.disk;
}

/** One tier per rounded price — keep the highest spec customers would pick anyway. */
export function collapseDuplicatePrices(rows: ProposedPlan[]): ProposedPlan[] {
  const best = new Map<number, ProposedPlan>();
  for (const row of rows) {
    const prev = best.get(row.suggestedUsd);
    if (!prev || isBetterSpec(row, prev)) best.set(row.suggestedUsd, row);
  }
  return [...best.values()].sort(
    (a, b) => a.units - b.units || a.suggestedUsd - b.suggestedUsd || a.vcpus - b.vcpus,
  );
}

/** Best profile per units band (size class) — avoids multiple SKUs at the same size. */
export function pickBestPerUnits(rows: ProposedPlan[]): ProposedPlan[] {
  const best = new Map<number, ProposedPlan>();
  for (const row of rows) {
    const prev = best.get(row.units);
    if (!prev || isBetterSpec(row, prev)) best.set(row.units, row);
  }
  return [...best.values()].sort((a, b) => a.units - b.units);
}

/**
 * One SKU per size (units), then stair-step retail so each size costs more than the last.
 * Does not inflate weaker profiles above stronger ones at the same size.
 */
export function bumpDuplicatePrices(rows: ProposedPlan[]): ProposedPlan[] {
  const tiers = pickBestPerUnits(rows);
  let floor = 0;
  return tiers.map((row) => {
    let suggestedUsd = row.suggestedUsd;
    if (suggestedUsd <= floor) {
      suggestedUsd = roundNiceUsd(floor + priceStep(floor || suggestedUsd));
    }
    floor = suggestedUsd;
    return { ...row, suggestedUsd, monthly_usd: suggestedUsd };
  });
}

export function applyDuplicatePriceStrategy(
  rows: ProposedPlan[],
  strategy: DuplicatePriceStrategy,
): ProposedPlan[] {
  if (strategy === 'show') return rows;
  if (strategy === 'bump') return bumpDuplicatePrices(rows);
  return collapseDuplicatePrices(rows);
}

export interface ProposedCatalogResult {
  plans: ProposedPlan[];
  /** Tiers before same-price collapse/bump (after sort, before maxRows). */
  beforeDuplicateHandling: number;
}

export function generateProposedCatalog(
  filters: CatalogFilters,
  P: ModelParams,
  C: ComputeResult,
  priceAnchor?: ComputeResult | null,
): ProposedPlan[] {
  return generateProposedCatalogWithMeta(filters, P, C, priceAnchor).plans;
}

export function generateProposedCatalogWithMeta(
  filters: CatalogFilters,
  P: ModelParams,
  C: ComputeResult,
  priceAnchor?: ComputeResult | null,
): ProposedCatalogResult {
  const candidates = buildCandidates(filters);
  const rows: ProposedPlan[] = [];

  for (const { vcpus, memory } of candidates) {
    const units = canonicalUnits(memory);
    const probe = { memory, vcpus, disk: 10, transfer: 0.5 };
    const max = maxPerServer(probe, P);
    if (max < filters.minFit) continue;

    const disk = deriveDiskGb(memory, max, P);
    const transfer = roundHalf(memory);
    const spec = {
      id: `prop-${vcpus}c-${memory}g`,
      name: `${vcpus}c-${memory}G`,
      memory,
      vcpus,
      disk,
      transfer,
      units,
      monthly_usd: 0,
    };

    const maxFull = maxPerServer(spec, P);
    if (maxFull === 0) continue;

    const beDzd = planBreakEvenDzd(spec, P, C);
    const targetDzd = priceAnchor
      ? frozenPlanTargetDzd(spec, P, priceAnchor)
      : beDzd / (1 - P.margin);
    const targetUsd = targetDzd / P.usd_dzd;
    const suggestedUsd = roundNiceUsd(targetUsd);

    rows.push({
      ...spec,
      monthly_usd: suggestedUsd,
      fit: planFit(maxFull),
      maxPerServer: maxFull,
      suggestedUsd,
    });
  }

  rows.sort(
    (a, b) =>
      a.units - b.units ||
      a.suggestedUsd - b.suggestedUsd ||
      b.vcpus - a.vcpus ||
      b.memory - a.memory,
  );
  const beforeDuplicateHandling = rows.length;
  const deduped = applyDuplicatePriceStrategy(rows, filters.duplicatePriceStrategy);
  return { plans: deduped.slice(0, filters.maxRows), beforeDuplicateHandling };
}

/** Smallest proposed tier max-per-server (for footer metric). */
export function smallestTierMaxPerServer(
  proposed: ProposedPlan[],
): number | null {
  if (!proposed.length) return null;
  return Math.min(...proposed.map((p) => p.maxPerServer));
}
