import { planBreakEvenDzd } from './pricing';
import { priceBandFromTarget } from './nicePricing';
import { canonicalUnits, maxPerServer, planFit } from './slotCapacity';
import type { CatalogFilters, ComputeResult, ModelParams, Plan, ProposedPlan } from '../types';

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

function nearestPlanId(
  pl: Pick<Plan, 'memory' | 'vcpus' | 'units'>,
  catalog: Plan[],
): string | undefined {
  if (!catalog.length) return undefined;
  let best = catalog[0];
  let bestScore = Infinity;
  for (const c of catalog) {
    const score = Math.abs(c.memory - pl.memory) + Math.abs(c.vcpus - pl.vcpus) * 0.5 + Math.abs(c.units - pl.units) * 0.25;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best.id;
}

export function generateProposedCatalog(
  filters: CatalogFilters,
  catalog: Plan[],
  P: ModelParams,
  C: ComputeResult,
): ProposedPlan[] {
  const candidates = buildCandidates(filters);
  const rows: ProposedPlan[] = [];
  const dedupe = new Set<string>();

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

    const dedupeKey = `${vcpus}-${memory}`;
    if (filters.hideDuplicates && dedupe.has(dedupeKey)) continue;
    dedupe.add(dedupeKey);

    const beDzd = planBreakEvenDzd(spec, P, C);
    const targetUsd = beDzd / (1 - P.margin) / P.usd_dzd;
    const band = priceBandFromTarget(targetUsd, filters.strategy);

    rows.push({
      ...spec,
      monthly_usd: band.suggestedUsd,
      fit: planFit(maxFull),
      maxPerServer: maxFull,
      band,
      nearestPlanId: nearestPlanId(spec, catalog),
    });
  }

  rows.sort((a, b) => a.units - b.units || a.band.suggestedUsd - b.band.suggestedUsd);
  return rows.slice(0, filters.maxRows);
}

/** Smallest proposed tier max-per-server (for footer metric). */
export function smallestTierMaxPerServer(
  proposed: ProposedPlan[],
): number | null {
  if (!proposed.length) return null;
  return Math.min(...proposed.map((p) => p.maxPerServer));
}
