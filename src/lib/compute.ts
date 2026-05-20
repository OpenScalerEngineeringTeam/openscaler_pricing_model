import type { ComputeResult, ModelParams, Scenario } from '../types';

export function compute(params: ModelParams, scenario: Scenario): ComputeResult {
  const P = params;
  let hw_landed_dzd: number;
  let monthly_hw: number;

  if (scenario === 'p1') {
    hw_landed_dzd = 2_000_000;
    monthly_hw = hw_landed_dzd / Math.min(P.amort_months, 36);
  } else {
    hw_landed_dzd = P.hw_usd * (1 + P.customs_pct) * P.usd_dzd;
    monthly_hw = hw_landed_dzd / P.amort_months;
  }

  const monthly_power = (P.server_w * P.pue * 720) / 1000 * P.power_dzd_kwh;
  const monthly_rack = P.rack_per_u_dzd * P.rack_u;
  const monthly_bw = (P.bw_mbps / Math.max(P.num_servers, 1)) * P.bw_dzd_mbps;
  const monthly_storage = P.nvme_tb_per_server * 1024 * P.disk_dzd_per_gb_mo;

  const sellable_by_ram = P.ram_gb / P.ram_oversub / P.avg_vm_ram;
  const sellable_by_cpu = (P.cpu_cores * P.cpu_oversub) / Math.max(P.avg_vm_vcpu, 0.5);
  const sellable_by_disk = (P.nvme_tb_per_server * 1024) / Math.max(P.avg_vm_disk_gb, 1);
  const sellable_vms = Math.floor(Math.min(sellable_by_ram, sellable_by_cpu, sellable_by_disk));
  const paying_vms = sellable_vms * P.utilization;

  const monthly_team = (P.team_people * P.salary_dzd) / Math.max(P.num_servers, 1);
  const monthly_misc = (hw_landed_dzd * 0.05) / 12 + 2000;
  const monthly_compute = monthly_hw + monthly_power + monthly_rack + monthly_bw + monthly_team + monthly_misc;
  const total = monthly_compute + monthly_storage;
  const compute_cost_per_paying_vm = paying_vms > 0 ? monthly_compute / paying_vms : 999_999;
  const cost_per_paying_vm = paying_vms > 0 ? total / paying_vms : 999_999;
  const min_price_vm = cost_per_paying_vm / (1 - P.margin);

  const binding = (
    [
      ['RAM', sellable_by_ram],
      ['CPU', sellable_by_cpu],
      ['Disk', sellable_by_disk],
    ] as [string, number][]
  ).sort((a, b) => a[1] - b[1])[0][0];

  return {
    monthly_hw,
    monthly_power,
    monthly_rack,
    monthly_bw,
    monthly_storage,
    monthly_team,
    monthly_misc,
    monthly_compute,
    total,
    sellable_vms,
    paying_vms,
    cost_per_paying_vm,
    compute_cost_per_paying_vm,
    min_price_vm,
    hw_landed_dzd,
    binding,
    sellable_by_ram,
    sellable_by_cpu,
    sellable_by_disk,
    storage_per_gb_mo: P.disk_dzd_per_gb_mo,
    transfer_per_tb_mo: P.transfer_dzd_per_tb_mo,
  };
}
