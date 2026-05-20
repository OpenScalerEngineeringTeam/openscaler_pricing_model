import type { ModelParams, Plan } from '../types';

export const DEFAULT_PARAMS: ModelParams = {
  usd_dzd: 135,
  hw_usd: 4000,
  customs_pct: 0.35,
  amort_months: 48,
  server_w: 300,
  pue: 1.4,
  power_dzd_kwh: 4.68,
  rack_u: 2,
  rack_per_u_dzd: 3000,
  bw_mbps: 1000,
  bw_dzd_mbps: 5,
  num_servers: 20,
  team_people: 2,
  salary_dzd: 150000,
  cpu_cores: 24,
  cpu_oversub: 4,
  ram_gb: 128,
  ram_oversub: 1.2,
  nvme_tb_per_server: 4,
  disk_dzd_per_gb_mo: 3,
  transfer_dzd_per_tb_mo: 150,
  avg_vm_ram: 2,
  avg_vm_vcpu: 2,
  avg_vm_disk_gb: 40,
  avg_vm_transfer_tb: 4,
  utilization: 0.7,
  margin: 0.4,
};

export const DEFAULT_PLANS: Plan[] = [
  { id: 'b-1-500mb-10', name: 'Basic 1-500mb-25GB', memory: 0.5, vcpus: 1, disk: 10, transfer: 0.5, units: 1, monthly_usd: 1.5 },
  { id: 's-1vcpu-1gb', name: 'Basic 1-1-25GB', memory: 1, vcpus: 1, disk: 15, transfer: 1, units: 1, monthly_usd: 2.5 },
  { id: 'b-1-2-50', name: 'Basic 1-2-50GB', memory: 2, vcpus: 1, disk: 20, transfer: 2, units: 2, monthly_usd: 3.5 },
  { id: 'b-2-4-100', name: 'Basic 2-4-100GB', memory: 4, vcpus: 2, disk: 40, transfer: 4, units: 4, monthly_usd: 7.5 },
  { id: 'b-4-8-160', name: 'Basic 4-8-160GB', memory: 8, vcpus: 4, disk: 80, transfer: 8, units: 8, monthly_usd: 15 },
  { id: 'b-8-16-320', name: 'Basic 8-16-320GB', memory: 16, vcpus: 8, disk: 160, transfer: 16, units: 16, monthly_usd: 25 },
  { id: 'b-8-32-640', name: 'Basic 8-32-640GB', memory: 32, vcpus: 8, disk: 640, transfer: 34, units: 34, monthly_usd: 35 },
  { id: 'b-16-32-640', name: 'Basic 16-32-640GB', memory: 32, vcpus: 16, disk: 320, transfer: 34, units: 34, monthly_usd: 60 },
  { id: 'b-16-64-1280', name: 'Basic 16-64-1280GB', memory: 64, vcpus: 16, disk: 640, transfer: 68, units: 64, monthly_usd: 98 },
  { id: 'b-32-64-1280', name: 'Basic 32-64-1280GB', memory: 64, vcpus: 32, disk: 640, transfer: 68, units: 64, monthly_usd: 175 },
  { id: 'b-32-128-2560', name: 'Basic 32-128-2560GB', memory: 128, vcpus: 32, disk: 1280, transfer: 136, units: 128, monthly_usd: 320 },
];

export const BAR_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#BA7517', '#7F77DD', '#D4537E', '#888'];
export const BAR_LABELS = ['Hardware', 'Power', 'Rack', 'Transit (pipe)', 'Storage (NVMe)', 'Team', 'Misc'];
