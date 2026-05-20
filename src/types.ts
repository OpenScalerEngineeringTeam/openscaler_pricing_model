export type Scenario = 'p1' | 'p2';
export type PriceDisplay = 'usd' | 'dzd';

export interface ModelParams {
  usd_dzd: number;
  hw_usd: number;
  customs_pct: number;
  amort_months: number;
  server_w: number;
  pue: number;
  power_dzd_kwh: number;
  rack_u: number;
  rack_per_u_dzd: number;
  bw_mbps: number;
  bw_dzd_mbps: number;
  num_servers: number;
  team_people: number;
  salary_dzd: number;
  cpu_cores: number;
  cpu_oversub: number;
  ram_gb: number;
  ram_oversub: number;
  nvme_tb_per_server: number;
  disk_dzd_per_gb_mo: number;
  transfer_dzd_per_tb_mo: number;
  avg_vm_ram: number;
  avg_vm_vcpu: number;
  avg_vm_disk_gb: number;
  avg_vm_transfer_tb: number;
  utilization: number;
  margin: number;
}

export interface Plan {
  id: string;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  units: number;
  monthly_usd: number;
}

export interface ComputeResult {
  monthly_hw: number;
  monthly_power: number;
  monthly_rack: number;
  monthly_bw: number;
  monthly_storage: number;
  monthly_team: number;
  monthly_misc: number;
  monthly_compute: number;
  total: number;
  sellable_vms: number;
  paying_vms: number;
  cost_per_paying_vm: number;
  compute_cost_per_paying_vm: number;
  min_price_vm: number;
  hw_landed_dzd: number;
  binding: string;
  sellable_by_ram: number;
  sellable_by_cpu: number;
  sellable_by_disk: number;
  storage_per_gb_mo: number;
  transfer_per_tb_mo: number;
}

export interface ControlField {
  key: keyof ModelParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  fmt?: (v: number) => string;
  tip?: string;
}

export interface ControlGroup {
  id: string;
  title: string;
  desc: string;
  show?: () => boolean;
  fields: ControlField[];
}
