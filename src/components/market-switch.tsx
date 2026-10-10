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
        compact && "rounded-[13px] p-0.5",
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
              "min-h-11 min-w-0 truncate whitespace-nowrap rounded-xl px-2 text-xs font-semibold transition-all duration-200",
              compact && "min-h-9 rounded-[10px] px-1.5 text-[12px]",
              on ? "bg-primary text-primary-fg shadow-[0_1px_2px_rgba(0,0,0,0.18)]" : "text-muted hover:text-fg",
            )}
          >
            {lang === "ar" ? meta.labelAr : meta.labelEn}
            {counts ? (
              <span className="ms-1 text-[10px] font-medium tabular-nums opacity-70">{counts[id]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
