import type { Plan } from '../types';

export function mapPlansFromJson(sizes: Array<Record<string, unknown>>): Plan[] {
  return sizes.map((s) => ({
    id: s.id as string,
    name: s.name as string,
    memory: s.memory as number,
    vcpus: s.vcpus as number,
    disk: s.disk as number,
    transfer: s.transfer as number,
    units: s.units as number,
    monthly_usd: parseFloat(String(s.price_monthly)),
  }));
}

export async function loadPlansFromJson(): Promise<Plan[] | null> {
  try {
    const res = await fetch('/pricing_placeholders.json');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.sizes?.length) return mapPlansFromJson(data.sizes);
  } catch {
    /* offline or missing */
  }
  return null;
}
