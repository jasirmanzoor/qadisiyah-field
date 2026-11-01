'use client';

import { MARKET_IDS, MARKETS, type MarketId } from '@/lib/markets';

interface MarketSwitcherProps {
  value: MarketId;
  onChange: (m: MarketId) => void;
  counts?: Partial<Record<MarketId, number>>;
  className?: string;
}

/** Two-option market selector: Al Qadisiyah | Al Shifa. */
export default function MarketSwitcher({ value, onChange, counts, className = '' }: MarketSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Market"
      className={`grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1 shadow ${className}`}
    >
      {MARKET_IDS.map((id) => {
        const m = MARKETS[id];
        const active = id === value;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => !active && onChange(id)}
            className={`flex min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left transition-colors ${
              active ? 'bg-accent text-accent-contrast' : 'text-foreground hover:bg-surface-2'
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">{m.label}</span>
              <span className={`block truncate text-[10px] leading-tight ${active ? 'opacity-80' : 'text-muted'}`}>
                <span dir="rtl">{m.labelAr}</span> · {m.area}
              </span>
            </span>
            {counts?.[id] !== undefined && (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  active ? 'bg-white/20' : 'bg-surface-2 text-muted'
                }`}
              >
                {counts[id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
