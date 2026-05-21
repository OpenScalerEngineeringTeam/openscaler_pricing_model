import type { ControlGroup, Scenario } from '../types';

export interface ControlGroupOptions {
  hwFromComponents?: boolean;
}

export function getControlGroups(scenario: Scenario, options: ControlGroupOptions = {}): ControlGroup[] {
  const { hwFromComponents = false } = options;
  return [
    {
      id: 'fx',
      title: 'Exchange rate',
      desc: 'Single DZD/USD rate for costs, catalog conversion, and DZD price display.',
      fields: [
        { key: 'usd_dzd', label: 'USD → DZD', min: 100, max: 350, step: 1, unit: 'DZD/$', tip: 'DZD per USD for hardware imports, listed catalog prices in DZD view, and converting model costs to dollars.' },
        { key: 'amort_months', label: 'Hardware amortization', min: 24, max: 72, step: 6, unit: 'mo', tip: 'Months to spread server purchase cost. Phase 1 caps at 36 mo. Longer = lower monthly hardware line.' },
      ],
    },
    {
      id: 'hardware',
      title: 'Hardware & import',
      desc: hwFromComponents
        ? 'Import overhead on the component-estimated BOM. Enable “Estimate from components” to edit unit prices in the next tab.'
        : 'Phase 2 self-built servers. Hidden in Phase 1 (fixed 2M DZD AT box).',
      show: () => scenario === 'p2',
      fields: [
        ...(hwFromComponents
          ? []
          : [
              {
                key: 'hw_usd' as const,
                label: 'Server hardware (USD)',
                min: 3000,
                max: 15000,
                step: 100,
                unit: '$',
                tip: 'Total purchase cost per server before shipping and customs (~$5.9k midpoint for 1×128 GiB×4 TB — see docs/reference/hardware-bom-defaults-2026.md).',
              },
            ]),
        {
          key: 'customs_pct',
          label: 'Import overhead',
          min: 0.15,
          max: 0.6,
          step: 0.01,
          fmt: (v: number) => `${Math.round(v * 100)}%`,
          tip: 'Extra % on top of hardware: duties, TVA, brokerage, shipping. Algeria IT imports often land around 30–45%.',
        },
      ],
    },
    {
      id: 'hw_components',
      title: 'Component pricing',
      desc: 'Unit USD prices × quantities (sockets, RAM and NVMe from Host capacity). Totals feed hardware cost when estimate is enabled.',
      show: () => scenario === 'p2' && hwFromComponents,
      fields: [
        { key: 'cpu_sockets', label: 'CPU sockets', min: 1, max: 4, step: 1, unit: 'socket', tip: 'Physical CPUs installed (1 = single-socket EPYC/Xeon, 2 = dual-socket).' },
        { key: 'hw_usd_per_cpu_socket', label: 'Price per socket', min: 700, max: 3500, step: 50, unit: '$', tip: 'Mid-range single-socket EPYC OEM/tray — default $2,000; range $1,400–$2,800 (2026 BOM doc).' },
        { key: 'hw_usd_per_gib_ram', label: 'Price per GiB RAM', min: 5, max: 20, step: 0.5, fmt: (v) => v.toFixed(1), unit: '$/GiB', tip: 'DDR5 ECC RDIMM — default $12/GiB; range $8–$18 (2026 AI-driven DRAM pricing).' },
        { key: 'hw_usd_per_tb_nvme', label: 'Price per TB NVMe', min: 100, max: 400, step: 5, unit: '$/TB', tip: 'Enterprise U.2/U.3 NVMe — default $250/TB; range $180–$350.' },
        { key: 'hw_usd_motherboard', label: 'Motherboard', min: 400, max: 1500, step: 50, unit: '$', tip: 'Single-socket EPYC board with IPMI — default $850; range $650–$1,100.' },
        { key: 'hw_usd_chassis_misc', label: 'Chassis, NIC & misc', min: 400, max: 1200, step: 50, unit: '$', tip: '2U chassis, redundant PSU, 10/25 GbE NIC, rails — default $750; range $550–$950.' },
      ],
    },
    {
      id: 'host',
      title: 'Host capacity',
      desc: 'Physical limits and oversubscription — how many VMs fit per machine.',
      fields: [
        { key: 'cpu_cores', label: 'Physical cores', min: 8, max: 96, step: 4, unit: 'c', tip: 'Real CPU cores per host (not threads). Example: 24-core single-socket EPYC.' },
        { key: 'cpu_oversub', label: 'CPU oversubscription', min: 1, max: 10, step: 0.5, fmt: (v) => `${v.toFixed(1)}×`, tip: 'vCPUs sold per physical core. 4× means 24 cores → 96 sellable vCPUs. Higher = more revenue risk if all VMs load CPU.' },
        { key: 'ram_gb', label: 'RAM per server', min: 32, max: 512, step: 16, unit: 'GB', tip: 'Installed ECC RAM per host. Often the binding constraint for VM count.' },
        { key: 'ram_oversub', label: 'RAM oversubscription', min: 1, max: 2, step: 0.05, fmt: (v) => `${v.toFixed(2)}×`, tip: 'Sell slightly more RAM than installed (1.0 = none). >1.2 is aggressive; hypervisor overhead already eats margin.' },
        { key: 'nvme_tb_per_server', label: 'NVMe capacity', min: 1, max: 32, step: 1, unit: 'TB', tip: 'Total fast storage installed per host. Caps how much disk you can provision across VMs.' },
        { key: 'server_w', label: 'Server TDP', min: 100, max: 600, step: 10, unit: 'W', tip: 'Thermal design power (watts) at full CPU load — used to estimate electricity per server.' },
        { key: 'pue', label: 'PUE', min: 1.1, max: 2, step: 0.05, fmt: (v) => v.toFixed(2), tip: 'Power Usage Effectiveness: datacenter draws PUE × server power (cooling, UPS, losses). 1.3–1.5 typical.' },
      ],
    },
    {
      id: 'infra',
      title: 'Colocation & network',
      desc: 'What Algérie Télécom / DC charges monthly.',
      fields: [
        { key: 'rack_per_u_dzd', label: 'Rack per U / month', min: 500, max: 15000, step: 500, unit: 'DZD', tip: 'Colocation rent per rack unit per month. This model assumes 2U per server (see rack_u in code).' },
        { key: 'bw_mbps', label: 'Committed bandwidth', min: 100, max: 10000, step: 100, unit: 'Mbps', tip: 'Total Mbps you buy for the fleet (international/transit pipe). Cost is split across all servers.' },
        { key: 'bw_dzd_mbps', label: 'Transit price', min: 0.5, max: 30, step: 0.5, unit: 'DZD/Mbps', tip: 'AT (or upstream) price per Mbps per month for the committed pipe — not per-VM egress.' },
      ],
    },
    {
      id: 'storage',
      title: 'Storage & egress unit costs',
      desc: 'Per-GB and per-TB rates applied to each catalog plan.',
      fields: [
        { key: 'disk_dzd_per_gb_mo', label: 'Storage (GiB/mo)', min: 0.5, max: 20, step: 0.5, fmt: (v) => v.toFixed(1), unit: 'DZD', tip: 'Monthly cost to provision 1 GiB of NVMe to a VM (amortization + overhead). Large disks on big plans add up fast.' },
        { key: 'transfer_dzd_per_tb_mo', label: 'Included transfer (TB/mo)', min: 25, max: 2000, step: 25, unit: 'DZD', tip: 'Cost per TB of monthly egress included in a plan. Priced per plan’s transfer column (0.5–136 TB).' },
      ],
    },
    {
      id: 'fleet',
      title: 'Fleet & operations',
      desc: 'People and scale — ops cost is divided by server count.',
      fields: [
        { key: 'num_servers', label: 'Fleet size', min: 2, max: 200, step: 1, unit: 'servers', tip: 'Number of physical hosts. More servers → lower ops $/server and bandwidth $/server, but more total CapEx.' },
        { key: 'team_people', label: 'Ops headcount', min: 1, max: 10, step: 1, unit: 'people', tip: 'Full-time people doing infra/ops (not product). Total payroll ÷ fleet size = ops cost per server.' },
        { key: 'salary_dzd', label: 'Salary per person', min: 50000, max: 400000, step: 10000, unit: 'DZD/mo', tip: 'Average monthly gross cost per ops FTE in DZD (salary + employer costs if you fold them in).' },
      ],
    },
    {
      id: 'pricing',
      title: 'VM mix & pricing targets',
      desc: 'Reference “typical” VM for slot math, plus business goals.',
      fields: [
        { key: 'avg_vm_ram', label: 'Ref VM RAM', min: 0.5, max: 16, step: 0.5, fmt: (v) => v.toFixed(1), unit: 'GiB', tip: 'Average RAM per paying VM — used to count how many slots fit on a host. Affects break-even scaling.' },
        { key: 'avg_vm_vcpu', label: 'Ref VM vCPUs', min: 1, max: 16, step: 1, unit: 'vCPU', tip: 'Average vCPUs per paying VM for capacity counting. Plans scale vs max(RAM/ref, vCPU/ref).' },
        { key: 'avg_vm_disk_gb', label: 'Ref VM disk', min: 10, max: 500, step: 5, unit: 'GB', tip: 'Average provisioned disk per VM for host disk capacity limits (sellable slots).' },
        { key: 'avg_vm_transfer_tb', label: 'Ref VM transfer', min: 0.5, max: 50, step: 0.5, fmt: (v) => v.toFixed(1), unit: 'TB/mo', tip: 'Average included egress per VM in the catalog — used for host-level egress budgeting in older logic; per-plan transfer is priced directly.' },
        { key: 'utilization', label: 'Target utilization', min: 0.3, max: 0.95, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, tip: 'Steady-state share of sellable slots that are paying. Use “Freeze retail prices” in VM pricing to set launch prices at a lower util and see effective margin as fill rate grows.' },
        { key: 'margin', label: 'Target gross margin', min: 0.1, max: 0.7, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`, tip: 'Profit margin on top of break-even. Target price = break-even ÷ (1 − margin). 40% → divide by 0.6.' },
      ],
    },
  ];
}
