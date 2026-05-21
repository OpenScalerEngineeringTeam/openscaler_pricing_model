# Production host spec (competitive & profitable)

This note documents the **physical host and fleet** from the chosen cost-model save: whether you can buy or build it in reality, how the app counts cores/RAM/disk, and the **frozen** VM prices that result.

**Canonical save (load in app):** [`optimal-host-spec.json`](./optimal-host-spec.json) (synced from [`saves/competitiv-and-profitable.json`](../../saves/competitiv-and-profitable.json))

Related: [Hardware BOM defaults (2026)](./hardware-bom-defaults-2026.md), [Cloud pricing model breakdown](./cloud_service_pricing_model_breakdown.md).

---

## Host capacity in the save

From [`optimal-host-spec.json`](./optimal-host-spec.json) → `parameters` (host + fleet knobs):

| Field                        |   Value | Meaning in the app                                                      |
| ---------------------------- | ------: | ----------------------------------------------------------------------- |
| `cpu_sockets`                |       1 | Single-socket server                                                    |
| `cpu_cores`                  |  **60** | **Physical cores** per host (not threads — see Host capacity in the UI) |
| `cpu_oversub`                |   5.5× | Up to **330 sellable vCPUs** per host in slot math (`60 × 5.5`)         |
| `ram_gb`                     | **512** | Installed ECC RAM (GiB)                                                 |
| `ram_oversub`                |  1.15× | ~589 GiB sellable in the model                                          |
| `nvme_tb_per_server`         |  **11** | Total NVMe capacity (TB) installed per host                             |
| `server_w`                   |   300 W | TDP used for power cost                                                 |
| `utilization`                |    0.55 | 55% of sellable slots assumed paying (model default)                    |
| `margin`                     |     0.5 | 50% margin on break-even targets                                        |
| `avg_vm_ram` / `avg_vm_vcpu` |   4 / 2 | Reference VM for fleet slot count and **per-plan** cost scaling         |
| `avg_vm_disk_gb`             |      80 | Reference disk for slot math                                            |
| `num_servers`                |      20 | Fleet size                                                              |

**UI:** scenario `p2`, component BOM mode on (`hw_from_components: true`), **Freeze prices** on at **85%** launch utilization (`freeze_utilization: 0.85`).

### Slot economics (approximate)

With this save loaded (reference VM 4 GiB / 2 vCPU / 80 GB disk):

- Sellable per host: RAM ~147 slots, CPU ~165, **disk ~140** → binding **disk** (~140 slots).
- Paying VMs at 55% model util: **~77** per server; frozen pricing anchor uses **85%** → **~119** paying slots per server for price targets.
- Fleet: **20** servers.

So the model is a **large single-socket** node with heavy RAM and NVMe, disk-limited for the reference VM shape.

---

## Frozen catalog prices (choice set)

With **Freeze prices** enabled and launch util **85%**, these are the rounded monthly targets from the proposed catalog (DZD in-app; USD below uses **~239 DZD/$** black-market rate for global comparison — the save still uses `usd_dzd: 135` for cost math):

| CPU    | RAM    | Disk     | Price (DZD) | Price (USD) |
| ------ | ------ | -------- | ----------: | ----------: |
| 1 core | 0.5 GB | 20 GB    |         878 |       $3.67 |
| 1 core | 1 GB   | 30 GB    |       1,080 |       $4.52 |
| 1 core | 2 GB   | 38 GB    |       1,431 |       $5.99 |
| 2 cores| 2 GB   | 40 GB    |       2,052 |       $8.59 |
| 2 cores| 4 GB   | 70 GB    |       2,835 |      $11.86 |
| 4 cores| 8 GB   | 130 GB   |       5,670 |      $23.72 |
| 8 cores| 16 GB  | 250 GB   |      11,205 |      $46.88 |
| 16 cores| 32 GB | 490 GB   |      22,275 |      $93.20 |
| 32 cores| 64 GB | 970 GB   |      44,415 |     $185.84 |
| 32 cores| 128 GB| 1,930 GB |      88,695 |     $371.11 |

---

## Can you assemble this in reality?

**Yes.** The save describes a **credible high-density cloud node**, scaled up from the project’s default reference (128 GiB, 4 TB) in the BOM guide.

### CPU — 60 physical cores, one socket

- Target class: **AMD EPYC single-socket** (SP5), tray/OEM — same direction as [hardware-bom-defaults-2026.md](./hardware-bom-defaults-2026.md).
- **60 physical cores on one socket** is a **top-tier single-socket** SKU (e.g. high-core-count EPYC 9004/9005), not a desktop part.
- Listings often mix **cores vs threads**; the model’s `cpu_cores` is **physical only**.

### RAM — 512 GB

- Typical: **16 × 32 GB DDR5 ECC RDIMMs** on a 24-DIMM EPYC board (or 8×64 GB if the board and budget allow).

### NVMe — 11 TB total

- Production-style: **4–8 U.2** enterprise drives (e.g. 4×3.84 TB with ~15 TB raw, or fewer larger modules) in a **2U** chassis with adequate PCIe lanes.

### Example bill of materials (conceptual)

| Part        | Direction                                           |
| ----------- | --------------------------------------------------- |
| CPU         | 1× AMD EPYC ~60 **physical** cores (single socket)  |
| Motherboard | Single-socket EPYC, IPMI, 24 DIMM slots, U.2 bays   |
| RAM         | 16× 32 GB DDR5 ECC RDIMM (512 GiB)                  |
| Storage     | ~11 TB U.2 NVMe total (mixed-capacity OK)           |
| Chassis     | 2U rack, redundant PSU, rails                       |
| NIC         | 10/25 GbE (onboard or add-in)                       |

**Power:** ~300 W in the save is plausible for this class at moderate load; validate against your SKU TDP and cooling.

**Procurement caveats:** confirm board max RAM per DIMM, NVMe slot count/lanes, and import/customs (`customs_pct: 0.35`) on top of BOM.

---

## BOM implied by the save (component mode)

Unit prices are in the JSON (`hw_usd_per_*`). Estimated **pre-import** server BOM:

```
$2,000  (1 socket CPU)
+ 512 × $12   RAM
+ 11 × $250   NVMe
+ $850        motherboard
+ $750        chassis / NIC / misc
≈ $12,494 USD
```

Compare to the smaller reference in [hardware-bom-defaults-2026.md](./hardware-bom-defaults-2026.md) (~$6.1k for 128 GiB, 4 TB, 1 socket). This host trades **much more RAM, cores, and NVMe** for a higher upfront box.

Landed cost in the app: BOM × `(1 + customs_pct)` × `usd_dzd`, amortized over `amort_months` (48).

---

## Pricing model notes

Per-plan break-even uses:

```text
computeScale = max(memory / avg_vm_ram, vcpus / avg_vm_vcpu)
break-even = computeScale × (compute cost per paying VM) + disk + transfer
```

With **`avg_vm_ram = 4`** and **`avg_vm_vcpu = 2`**, tiers where RAM dominates `max()` share the same compute slice until vCPUs exceed the RAM ratio. **Freeze prices** locks catalog targets to costs computed at **85%** utilization so launch pricing stays stable if you later model lower paying util (55% in `parameters.utilization`).

---

## How to use these files

1. Open the cost model app → **Import** → select [`optimal-host-spec.json`](./optimal-host-spec.json).
2. Or import [`saves/competitiv-and-profitable.json`](../../saves/competitiv-and-profitable.json) directly.
3. Enable **Freeze prices** and set launch util to **85%** if not already loaded from the save.
4. After changing parameters, update **both** the save under `saves/` and this pinned JSON if you want docs and app to stay aligned.

---

## Changelog

| Date       | Note                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| 2026-05-21 | Replaced optimizer “48c / 256 GiB / 5 TB” pin with `competitiv-and-profitable` host + prices. |
| 2026-05-21 | Initial doc + pinned save from earlier optimizer output.                                      |
