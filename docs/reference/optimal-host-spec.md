# Optimal host spec (optimizer save)

This note documents the **physical host** implied by the optimizer’s “optimal” cost-model save: whether you can buy or build it in reality, how the app counts cores/RAM/disk, and how that ties to VM pricing behavior.

**Canonical save (load in app):** [`optimal-host-spec.json`](./optimal-host-spec.json)

Related: [Hardware BOM defaults (2026)](./hardware-bom-defaults-2026.md), [Cloud pricing model breakdown](./cloud_service_pricing_model_breakdown.md).

---

## Host capacity in the save

From [`optimal-host-spec.json`](./optimal-host-spec.json) → `parameters` (host + fleet knobs):

| Field                        |   Value | Meaning in the app                                                      |
| ---------------------------- | ------: | ----------------------------------------------------------------------- |
| `cpu_sockets`                |       1 | Single-socket server                                                    |
| `cpu_cores`                  |  **48** | **Physical cores** per host (not threads — see Host capacity in the UI) |
| `cpu_oversub`                |      5× | Up to **240 sellable vCPUs** per host in slot math (`48 × 5`)           |
| `ram_gb`                     | **256** | Installed ECC RAM (GiB)                                                 |
| `ram_oversub`                |    1.1× | ~281 GiB sellable in the model                                          |
| `nvme_tb_per_server`         |   **5** | Total NVMe capacity (TB) installed per host                             |
| `server_w`                   |   300 W | TDP used for power cost                                                 |
| `utilization`                |     0.7 | 70% of sellable slots assumed paying                                    |
| `avg_vm_ram` / `avg_vm_vcpu` |   2 / 2 | Reference VM for fleet slot count and **per-plan** cost scaling         |

**UI:** scenario `p2`, component BOM mode on (`hw_from_components: true`).

### Slot economics (approximate)

With this save loaded:

- Sellable slots per host (ref VM 2G / 2 vCPU / 40G disk): RAM ~141, **CPU ~120**, disk ~128 → binding **CPU** (~120 slots).
- Paying VMs at 70% util: **~84** per server.
- Fleet: **50** servers.

So the model is a **dense CPU-selling** single socket, not a tiny lab machine.

---

## Can you assemble this in reality?

**Yes.** The save describes a **credible cloud/VM node**, not fantasy hardware. It is scaled up from the project’s default reference (1×128 GiB, 4 TB, ~24–32 cores) documented in the BOM guide.

### CPU — 48 physical cores, one socket

- Target class: **AMD EPYC single-socket** (SP3/SP5), tray/OEM — same direction as [hardware-bom-defaults-2026.md](./hardware-bom-defaults-2026.md).
- **48 physical cores on one socket** is a **mid/high single-socket** SKU (e.g. ~48-core EPYC in the 9004/9005 families), not a desktop Ryzen.
- Watch listings: ads often say “48 cores” meaning **threads** (24c/48t). The model’s `cpu_cores` is **physical only**.
- Cheaper real-world alternatives (not this save): dual **24-core** sockets, or **32-core** + higher `cpu_oversub` — would change economics in the app.

### RAM — 256 GB

- Very standard: **8 × 32 GB DDR5 ECC RDIMMs** on a 12- or 24-DIMM EPYC board.
- Matches the older blueprint in `cloud_service_pricing_model_breakdown.md` (256 GB called out there as well).

### NVMe — 5 TB total

- **Easier** than many production hosts (the breakdown doc example uses **4 × 3.84 TB** ≈ 15 TB).
- Typical build: several **U.2** enterprise drives (e.g. 5×1 TB, or 2×2 TB + 1 TB) in a **2U** chassis with 4–8 NVMe bays.

### Example bill of materials (conceptual)

| Part        | Direction                                          |
| ----------- | -------------------------------------------------- |
| CPU         | 1× AMD EPYC ~48 **physical** cores (single socket) |
| Motherboard | Single-socket EPYC, IPMI, enough DIMM + U.2 slots  |
| RAM         | 8× 32 GB DDR5 ECC RDIMM                            |
| Storage     | ~5 TB U.2 NVMe total                               |
| Chassis     | 2U rack, redundant PSU, rails                      |
| NIC         | 10/25 GbE (onboard or add-in)                      |

**Power:** ~250–350 W TDP for this CPU class is plausible; the save uses **300 W** for OPEX.

**Procurement caveats:** confirm board max RAM with 32 GB modules, NVMe slot count/lanes, and import/customs (`customs_pct: 0.35` in the save) on top of BOM.

---

## BOM implied by the save (component mode)

Unit prices are in the JSON (`hw_usd_per_*`). Estimated **pre-import** server BOM:

```
$2,000  (1 socket CPU)
+ 256 × $12   RAM
+ 5 × $250    NVMe
+ $850        motherboard
+ $750        chassis / NIC / misc
≈ $7,922 USD
```

Compare to the smaller reference in [hardware-bom-defaults-2026.md](./hardware-bom-defaults-2026.md) (~$6.1k for 128 GiB, 4 TB, 1 socket). This optimal host trades **more RAM, more cores, and 5 TB** for a higher tray-upfront box.

Landed cost in the app: BOM × `(1 + customs_pct)` × `usd_dzd`, amortized over `amort_months` (48).

---

## Pricing model quirks (same save)

Per-plan break-even uses:

```text
computeScale = max(memory / avg_vm_ram, vcpus / avg_vm_vcpu)
break-even = computeScale × (compute cost per paying VM) + disk + transfer
```

With **`avg_vm_ram = 2`** and **`avg_vm_vcpu = 2`**, any tier where **RAM scale ≥ vCPU scale** gets the **same** compute slice. Example: all **8G** proposed tiers (2c / 4c / 8c) share one break-even until vCPUs exceed the RAM ratio.

That does **not** mean CPU was free to buy — it means **marginal vCPU is not priced** once RAM dominates the `max()` rule. The compare tab avoids this visually because catalog plans keep vCPU and RAM coupled (e.g. 8G/4c, 16G/8c).

---

## How to use these files

1. Open the cost model app → **Import** → select [`optimal-host-spec.json`](./optimal-host-spec.json).
2. Or copy/import from [`saves/optimal.json`](../../saves/optimal.json) if that is your latest optimizer run.
3. After re-running the optimizer, update **both** the save under `saves/` and this pinned JSON if you want docs and app to stay aligned.

---

## Changelog

| Date       | Note                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| 2026-05-21 | Initial doc + pinned save from optimizer output (`saves/optimal.json`). |
