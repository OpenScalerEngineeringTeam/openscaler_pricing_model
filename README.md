# OpenScaler cost model

React + Vite app for cloud pricing and cost breakdown.

```bash
pnpm install
pnpm dev       # http://localhost:5173
```

## Documentation

| Path | Purpose |
|------|---------|
| [`docs/reference/hardware-bom-defaults-2026.md`](docs/reference/hardware-bom-defaults-2026.md) | **Source of truth** for Phase 2 hardware unit prices ($/socket, $/GiB RAM, $/TB NVMe, etc.) and manual server BOM default (~$5.9k for 1×128 GiB×4 TB) |
| [`cloud_service_pricing_model_breakdown.md`](cloud_service_pricing_model_breakdown.md) | Earlier cost-model conversation and protocol (older hardware ballparks) |

App defaults in `src/lib/hardwareCost.ts` and `src/lib/constants.ts` follow the 2026 BOM reference unless you override them in the UI or a saved config.

## Layout

- `src/lib/` — compute, pricing, config save/load, hardware BOM estimate
- `src/components/` — Toolbar, CostBreakdown, ParamsPanel, VmPricingCard
