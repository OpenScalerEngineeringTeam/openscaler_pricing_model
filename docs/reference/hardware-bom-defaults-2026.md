# Hardware BOM default unit prices (2026)

Recommended default pricing for server components at **Taiwan/Asia wholesale/OEM** levels (pre-import: no duties, shipping, or logistics). Used as the baseline for `DEFAULT_HW_UNIT_PRICES` and manual **Server hardware (USD)** in the app.

**Reference config:** 1 socket, 128 GiB RAM, 4 TB NVMe (matches default host capacity in the cost model).

## Executive summary

2026 market conditions show strong AI-driven demand: **DRAM** and **enterprise NVMe** are up sharply; CPU and motherboard pricing is more stable but elevated on newer generations (e.g. AMD EPYC 9005 “Turin”). These defaults suit bulk/cloud-scale purchasing and BOM / TCO modeling. They are higher than early 2024–2025 ballparks in `cloud_service_pricing_model_breakdown.md`.

## Component pricing

### 1. Price per socket (CPU)

| | |
|---|---|
| **Default** | **$2,000** |
| **Range** | $1,400 – $2,800 |

Mid-range single-socket AMD EPYC (16–64 cores) for cloud/VM workloads. Bulk OEM/tray pricing from Taiwanese suppliers; AMD preferred for single-socket density and power efficiency.

### 2. Price per GiB RAM

| | |
|---|---|
| **Default** | **$12 / GiB** |
| **Range** | $8 – $18 / GiB |

Server DDR5 ECC RDIMM; AI demand has pushed 64 GiB modules toward ~$520–$1,150. For 128 GiB: roughly **$1,000–$2,300**.

### 3. Price per TB NVMe

| | |
|---|---|
| **Default** | **$250 / TB** |
| **Range** | $180 – $350 / TB |

Enterprise U.2/U.3 NVMe (mixed-use / read-intensive). For 4 TB: roughly **$720–$1,400**.

### 4. Motherboard

| | |
|---|---|
| **Default** | **$850** |
| **Range** | $650 – $1,100 |

Single-socket AMD EPYC boards (Supermicro, Gigabyte, ASRock Rack) with IPMI, DDR5, adequate PCIe.

### 5. Chassis, NIC & misc

| | |
|---|---|
| **Default** | **$750** |
| **Range** | $550 – $950 |

1U/2U rackmount, redundant PSUs, 10/25 GbE NIC, rails, cables.

## Estimated BOM (reference config)

Using recommended defaults:

```
$2,000 + (128 × $12) + (4 × $250) + $850 + $750 ≈ $6,136
```

Report midpoint for planning: **~$5,900**; sensitivity band **~$5,300 – $6,500**.

## Maintenance

- Revisit defaults every **3–6 months** (DRAM/NAND volatility).
- Use **range** values for sensitivity analysis and supplier negotiations.
- Prefer **AMD EPYC single-socket** for cloud price/performance; validate SKUs before purchase.
