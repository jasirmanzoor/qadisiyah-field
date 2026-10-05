import { useMemo, useState } from "react";
import { useField } from "@/stores/field";
import { dealersInMarket } from "@/lib/markets";
import { completenessPct } from "@/lib/completeness";
import type { MarketId } from "@/lib/types";

function money(n: number) {
  return `${Math.round(n).toLocaleString("en-SA")} SAR`;
}

export function CeoPage() {
  const snapshot = useField((s) => s.snapshot);
  const [market, setMarket] = useState<MarketId | "both">("both");
  const [slides, setSlides] = useState(false);
  const rows = useMemo(() => {
    const markets: MarketId[] = market === "both" ? ["qadisiyah", "shifa"] : [market];
    return markets.flatMap((m) => dealersInMarket(snapshot.dealerships, m).map((d) => ({ d, m, s: snapshot.surveys.find((x) => x.dealershipId === d.id)?.payload })));
  }, [snapshot, market]);
  const withStock = rows.filter((r) => r.s?.inventoryUnits != null);
  const stock = withStock.reduce((n, r) => n + (r.s?.inventoryUnits ?? 0), 0);
  const value = withStock.reduce((n, r) => n + (r.s?.inventoryUnits ?? 0) * (r.s?.avgSellingPriceSar ?? 0), 0);
  const finance = rows.filter((r) => r.s?.financeAvailable === "yes").length;
  const complete = rows.length ? Math.round(rows.reduce((n, r) => n + completenessPct(r.d, r.s), 0) / rows.length) : 0;
  const brands = new Map<string, number>();
  for (const r of rows) for (const b of r.s?.mainBrands ?? []) brands.set(b, (brands.get(b) ?? 0) + 1);
  const top = [...brands.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const confidence = `Based on ${rows.length} showrooms, ${complete}% complete. Inventory value is stock × ASP and is an estimate.`;

  function exportCsv() {
    const lines = ["market,name,stock,asp,size,age,finance", ...rows.map((r) => [r.m, r.d.nameEn, r.s?.inventoryUnits ?? "", r.s?.avgSellingPriceSar ?? "", r.s?.showroomSizeSqm ?? "", r.s?.inventoryAgePctOver5 ?? "", r.s?.financeAvailable ?? ""].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "autolink-field-brief.csv";
    a.click();
  }

  return (
    <div className={slides ? "fixed inset-0 z-40 overflow-auto bg-bg p-6" : "flex flex-col gap-4 p-4"}>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">CEO brief</h1>
        {(["both", "qadisiyah", "shifa"] as const).map((id) => (
          <button key={id} type="button" className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold" onClick={() => setMarket(id)}>{id}</button>
        ))}
        <button type="button" className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold" onClick={() => setSlides((v) => !v)}>{slides ? "Exit slides" : "Slides"}</button>
        <button type="button" className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold" onClick={() => window.print()}>Export PDF</button>
        <button type="button" className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold" onClick={exportCsv}>Export table</button>
      </div>
      <p className="text-xs text-muted">{confidence}</p>
      <section className="grid grid-cols-2 gap-2">
        <article className="rounded-2xl bg-surface-2 p-3"><p className="text-xs text-muted">Showrooms</p><p className="text-2xl font-semibold">{rows.length}</p></article>
        <article className="rounded-2xl bg-surface-2 p-3"><p className="text-xs text-muted">Stock observed</p><p className="text-2xl font-semibold">{stock}</p></article>
        <article className="rounded-2xl bg-surface-2 p-3"><p className="text-xs text-muted">Estimated inventory value</p><p className="text-lg font-semibold">{money(value)}</p></article>
        <article className="rounded-2xl bg-surface-2 p-3"><p className="text-xs text-muted">Finance enabled</p><p className="text-2xl font-semibold">{rows.length ? Math.round((finance / rows.length) * 100) : 0}%</p></article>
      </section>
      <section className="rounded-2xl bg-surface-2 p-3">
        <p className="text-sm font-semibold">Brand share</p>
        <p className="text-xs text-muted">{confidence}</p>
        {top.map(([name, n]) => <p key={name} className="mt-1 text-sm">{name} · {n}</p>)}
        <p className="mt-2 text-xs">Takeaway: brand counts only include lots that named brands. Gaps are unsurveyed desks, not zero stock.</p>
      </section>
      <section className="rounded-2xl bg-surface-2 p-3">
        <p className="text-sm font-semibold">Key opportunities / data gaps</p>
        <p className="mt-1 text-sm">Finance is recorded on {finance} of {rows.length} desks. The rest cannot be treated as unwilling — the field was not taken.</p>
        <p className="mt-1 text-sm">Estimated value uses only lots with both stock and ASP. Do not scale it to the full market.</p>
      </section>
    </div>
  );
}
