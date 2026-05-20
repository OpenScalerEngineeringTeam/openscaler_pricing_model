import type { ModelParams } from '../types';

/** Baseline USD unit costs (pre-import) from the Phase 2 reference server in the cost model doc. */
export const DEFAULT_HW_UNIT_PRICES = {
  hw_usd_per_cpu_socket: 1500,
  hw_usd_per_gib_ram: 2.5,
  hw_usd_per_tb_nvme: 150,
  hw_usd_motherboard: 600,
  hw_usd_chassis_misc: 500,
} as const;

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
