import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { matchQueryToDealer, parseLookupLines } from "@/lib/bulk-match";
import { COPY } from "@/lib/i18n";
import { MARKET_CENTER } from "@/lib/geo";
import { flagsFromNote } from "@/lib/seed";
import type { BulkSearchHit, Dealership } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

function jitter(name: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return {
    lat: MARKET_CENTER.lat + ((h % 80) / 10000 - 0.004),
    lng: MARKET_CENTER.lng + (((h >> 8) % 80) / 10000 - 0.004),
  };
}

function dealerToHit(query: string, d: Dealership): BulkSearchHit {
  return {
    id: uid(),
    query,
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    phone: d.listedPhone,
    lat: d.lat,
    lng: d.lng,
    sourceUrl: null,
    note: "Matched your roster.",
    matchDealershipId: d.id,
  };
}

export function BulkSearchPanel({
  onSelectDealers,
}: {
  onSelectDealers: (ids: string[]) => void;
}) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const snapshot = useField((s) => s.snapshot);
  const bulkSearch = useField((s) => s.bulkSearch);
  const upsertDealer = useField((s) => s.upsertDealer);

  const [mode, setMode] = useState<"discover" | "lookup">("lookup");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [hits, setHits] = useState<BulkSearchHit[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const remaining = Math.max(0, snapshot.settings.dailyCap - snapshot.settings.runsToday);
  const newHits = useMemo(() => hits.filter((h) => !h.matchDealershipId), [hits]);
  const matchedHits = useMemo(() => hits.filter((h) => h.matchDealershipId), [hits]);
  const pickedNew = hits.filter((h) => picked.includes(h.id) && !h.matchDealershipId);
  const pickedMatched = hits.filter((h) => picked.includes(h.id) && h.matchDealershipId);

  async function run() {
    if (!query.trim() || busy) return;
    setBusy(true);
    setMsg(null);

    const roster = snapshot.dealerships.map((d) => ({
      id: d.id,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      phone: d.listedPhone,
    }));

    if (mode === "lookup") {
      const lines = parseLookupLines(query);
      const local: BulkSearchHit[] = [];
      const unmatched: string[] = [];
      for (const line of lines) {
        const found = matchQueryToDealer(line, roster);
        const dealer = found ? snapshot.dealerships.find((d) => d.id === found.id) : undefined;
        if (dealer) local.push(dealerToHit(line, dealer));
        else unmatched.push(line);
      }
      if (!unmatched.length) {
        setHits(local);
        setPicked(local.map((h) => h.id));
        setMsg(local.length ? `${local.length} ${t.hitsFound}` : t.noHits);
        setBusy(false);
        return;
      }
      const res = await bulkSearch("lookup", unmatched.join("\n"));
      if (!res.ok) {
        setHits(local);
        setPicked(local.length ? [] : []);
        setMsg(res.error ?? "Failed");
        setBusy(false);
        return;
      }
      const merged = [...local, ...(res.hits ?? [])];
      setHits(merged);
      setPicked(merged.filter((h) => !h.matchDealershipId).map((h) => h.id));
      setMsg(res.warning ?? `${merged.length} ${t.hitsFound}${res.charged ? " · 1 credit" : ""}`);
      setBusy(false);
      return;
    }

    const res = await bulkSearch("discover", query.trim());
    setBusy(false);
    if (!res.ok) {
      setHits([]);
      setPicked([]);
      setMsg(res.error ?? "Failed");
      return;
    }
    const next = res.hits ?? [];
    setHits(next);
    setPicked(next.filter((h) => !h.matchDealershipId).map((h) => h.id));
    if (res.warning) setMsg(res.warning);
    else if (!next.length) setMsg(t.noHits);
    else setMsg(`${next.length} ${t.hitsFound}${res.charged ? " · 1 credit" : ""}`);
  }

  async function addNew() {
    if (!pickedNew.length) return;
    setAdding(true);
    const createdByHit = new Map<string, string>();
    for (const hit of pickedNew) {
      const loc =
        hit.lat != null && hit.lng != null ? { lat: hit.lat, lng: hit.lng } : jitter(hit.nameEn || hit.nameAr);
      const note = [hit.note, hit.sourceUrl ? `Source: ${hit.sourceUrl}` : "", hit.lat == null ? "Location approximate — verify in field" : ""]
        .filter(Boolean)
        .join(". ");
      const { flags, status } = flagsFromNote(note);
      const dealer: Dealership = {
        id: uid(),
        nameEn: hit.nameEn || hit.nameAr,
        nameAr: hit.nameAr,
        lat: loc.lat,
        lng: loc.lng,
        listedPhone: hit.phone,
        seedNote: note || "Added from bulk search",
        status,
        flags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await upsertDealer(dealer);
      createdByHit.set(hit.id, dealer.id);
    }
    setHits((prev) =>
      prev.map((h) => (createdByHit.has(h.id) ? { ...h, matchDealershipId: createdByHit.get(h.id) ?? null } : h)),
    );
    onSelectDealers([...createdByHit.values()]);
    setPicked([]);
    setMsg(t.addedToRoster);
    setAdding(false);
  }

  function selectMatches() {
    const ids = pickedMatched.map((h) => h.matchDealershipId).filter((id): id is string => Boolean(id));
    if (ids.length) onSelectDealers(ids);
  }

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t.bulkSearch}</p>
          <p className="mt-1 text-xs text-muted">{t.bulkSearchHint}</p>
        </div>
        <Search className="mt-0.5 size-4 shrink-0 text-muted" />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ["lookup", t.lookupList],
            ["discover", t.discoverMarket],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "min-h-10 rounded-lg text-sm font-medium",
              mode === id ? "bg-primary text-primary-fg" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "lookup" ? (
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.bulkPlaceholderLookup}
          className="min-h-28"
        />
      ) : (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.bulkPlaceholderDiscover}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
        />
      )}

      <p className="mt-2 text-xs text-muted">{t.bulkUsesOne}</p>
      <Button
        className="mt-3 w-full"
        disabled={busy || !query.trim() || (mode === "discover" && remaining < 1)}
        onClick={() => void run()}
      >
        {busy ? t.searchingWeb : t.runBulkSearch}
      </Button>
      {msg ? <p className="mt-2 text-xs text-muted">{msg}</p> : null}

      {hits.length ? (
        <ul className="mt-3 flex max-h-72 flex-col gap-1 overflow-auto">
          {hits.map((h) => {
            const on = picked.includes(h.id);
            const known = Boolean(h.matchDealershipId);
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() =>
                    setPicked((prev) => (on ? prev.filter((id) => id !== h.id) : [...prev, h.id]))
                  }
                  className="flex w-full items-start gap-2 rounded-xl px-1 py-2 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded border",
                      on ? "border-primary bg-primary" : "border-border-strong",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{h.nameEn}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
                          known ? "bg-status-green/15 text-status-green" : "bg-status-amber/15 text-status-amber",
                        )}
                      >
                        {known ? t.onRoster : t.newHit}
                      </span>
                    </span>
                    {h.nameAr ? (
                      <span className="block truncate text-xs text-muted" dir="rtl">
                        {h.nameAr}
                      </span>
                    ) : null}
                    <span className="block truncate text-xs text-faint">
                      {[h.query && h.query !== h.nameEn ? `for "${h.query}"` : null, h.phone, h.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hits.length ? (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {newHits.length ? (
            <Button variant="secondary" disabled={adding || !pickedNew.length} onClick={() => void addNew()}>
              {adding ? "…" : `${t.addSelected}${pickedNew.length ? ` (${pickedNew.length})` : ""}`}
            </Button>
          ) : null}
          {matchedHits.length ? (
            <Button variant="secondary" disabled={!pickedMatched.length} onClick={selectMatches}>
              {t.selectMatches}
              {pickedMatched.length ? ` (${pickedMatched.length})` : ""}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
