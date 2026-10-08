import type { Dealership } from "./types";

/** Stable 1…N labels for the current market roster, walking-order by SD id. */
export function dealerSerials(dealers: Dealership[]): Map<string, number> {
  const sorted = [...dealers].sort((a, b) => {
    const sa = a.flags?.sdId || a.id;
    const sb = b.flags?.sdId || b.id;
    return sa.localeCompare(sb, undefined, { numeric: true });
  });
  return new Map(sorted.map((d, i) => [d.id, i + 1]));
}

export function pinBox(n: number, selected: boolean) {
  const digits = String(Math.max(0, n)).length;
  const h = selected ? 32 : 26;
  const w = selected
    ? digits >= 3 ? 40 : digits === 2 ? 34 : 32
    : digits >= 3 ? 34 : digits === 2 ? 30 : 26;
  return { w, h };
}
