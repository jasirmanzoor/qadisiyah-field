import { MARKET_IDS, MARKET_META, type MarketId } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { usePrefs } from "@/stores/prefs";

export function MarketSwitch({
  counts,
  compact = false,
}: {
  counts?: Record<MarketId, number>;
  compact?: boolean;
}) {
  const { lang, market, setMarket } = usePrefs();
  return (
    <div
      role="tablist"
      aria-label={lang === "ar" ? "السوق" : "Market"}
      className={cn(
        "qads-hud grid grid-cols-2 gap-1 rounded-2xl p-1",
        compact && "rounded-xl p-0.5",
      )}
    >
      {MARKET_IDS.map((id) => {
        const meta = MARKET_META[id];
        const on = market === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setMarket(id)}
            className={cn(
              "min-h-11 rounded-xl px-2 text-xs font-semibold transition-colors duration-150",
              compact && "rounded-lg text-[11px]",
              on ? "bg-primary text-primary-fg" : "text-muted",
            )}
          >
            {lang === "ar" ? meta.labelAr : meta.labelEn}
            {counts ? (
              <span className="ms-1.5 tabular-nums opacity-80">{counts[id]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
