import type { ModelParams } from '../types';

/** Pre-import USD unit costs — see docs/reference/hardware-bom-defaults-2026.md */
export const HARDWARE_BOM_DEFAULTS_DOC = 'docs/reference/hardware-bom-defaults-2026.md';

/** Taiwan/Asia wholesale/OEM defaults (May 2026); 1×128 GiB×4 TB reference server ≈ $6.1k BOM. */
export const DEFAULT_HW_UNIT_PRICES = {
  hw_usd_per_cpu_socket: 2000,
  hw_usd_per_gib_ram: 12,
  hw_usd_per_tb_nvme: 250,
  hw_usd_motherboard: 850,
  hw_usd_chassis_misc: 750,
} as const;

/** Manual server hardware default when component estimate is off (report midpoint ~$5.9k). */
export const DEFAULT_HW_USD = 5900;

export function estimateServerHwUsd(P: ModelParams): number {
  return (
    P.cpu_sockets * P.hw_usd_per_cpu_socket +
    P.ram_gb * P.hw_usd_per_gib_ram +
    P.nvme_tb_per_server * P.hw_usd_per_tb_nvme +
    P.hw_usd_motherboard +
    P.hw_usd_chassis_misc
  );
}

export function effectiveHwUsd(P: ModelParams, hwFromComponents: boolean): number {
  return hwFromComponents ? estimateServerHwUsd(P) : P.hw_usd;
}
