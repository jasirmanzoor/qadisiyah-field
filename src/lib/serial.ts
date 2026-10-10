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

export function pinBox(_n: number, _selected: boolean) {
  return { w: 26, h: 26 };
}
