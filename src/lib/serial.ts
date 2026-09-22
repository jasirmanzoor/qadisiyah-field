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
  const digits = String(n).length;
  const h = selected ? 26 : 22;
  const w = selected
    ? digits >= 3 ? 34 : digits === 2 ? 28 : 26
    : digits >= 3 ? 30 : digits === 2 ? 24 : 22;
  return { w, h };
}
