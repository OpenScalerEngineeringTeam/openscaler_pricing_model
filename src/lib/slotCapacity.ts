import type { ModelParams, Plan, PlanFit } from '../types';

export function canonicalUnits(memoryGiB: number): number {
  return Math.ceil(memoryGiB);
}

export function maxPerServer(
  pl: Pick<Plan, 'memory' | 'vcpus' | 'disk'>,
  P: ModelParams,
): number {
  const byRam = P.ram_gb / P.ram_oversub / Math.max(pl.memory, 0.25);
  const byCpu = (P.cpu_cores * P.cpu_oversub) / Math.max(pl.vcpus, 0.5);
  const byDisk = (P.nvme_tb_per_server * 1024) / Math.max(pl.disk, 1);
  return Math.floor(Math.min(byRam, byCpu, byDisk));
}

export function planFit(max: number): PlanFit {
  if (max >= 8) return 'ok';
  if (max >= 4) return 'tight';
  if (max >= 1) return 'risky';
  return 'over';
}

export function fitLabel(fit: PlanFit, max: number): string {
  if (fit === 'over') return '0/host';
  return `${max}/host`;
}

export interface HostCapacitySummary {
  sellableRamGiB: number;
  sellableVcpus: number;
  sellableDiskGb: number;
  binding: 'RAM' | 'CPU' | 'Disk';
}

export function hostCapacitySummary(P: ModelParams): HostCapacitySummary {
  const sellableRamGiB = P.ram_gb / P.ram_oversub;
  const sellableVcpus = P.cpu_cores * P.cpu_oversub;
  const sellableDiskGb = P.nvme_tb_per_server * 1024;
  const limits: [HostCapacitySummary['binding'], number][] = [
    ['RAM', sellableRamGiB],
    ['CPU', sellableVcpus],
    ['Disk', sellableDiskGb],
  ];
  const binding = limits.sort((a, b) => a[1] - b[1])[0][0];
  return { sellableRamGiB, sellableVcpus, sellableDiskGb, binding };
}

export function unitsMismatch(pl: Plan): boolean {
  return pl.units !== canonicalUnits(pl.memory);
}
