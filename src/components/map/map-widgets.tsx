import { cn } from "@/lib/utils";
import type { Dealership } from "@/lib/types";
import { X } from "lucide-react";

export function IconTool({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-xl transition-colors duration-150",
        active ? "bg-primary text-primary-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_45%,transparent)]" : "text-fg hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

export function LegendDots() {
  const items = [
    ["not_visited", "Not visited"],
    ["partial", "Partial"],
    ["completed", "Complete"],
    ["closed", "Closed"],
    ["competitor", "Competitor"],
  ] as const;
  return (
    <div className="flex items-center gap-2">
      {items.map(([k, label]) => (
        <span key={k} className="flex items-center gap-1" title={label}>
          <span className={cn("qads-pin qads-pin-sm", `qads-pin-${k}`)} />
        </span>
      ))}
      <span className="flex items-center gap-1" title="Both markets">
        <span className="qads-pin qads-pin-sm qads-pin-not_visited qads-pin-dual" />
      </span>
    </div>
  );
}

export function ListSheet({
  title,
  hint,
  onClose,
  children,
}: {
  title: string;
  hint?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="qads-sheet absolute inset-x-3 bottom-3 z-20 max-h-[48vh] overflow-auto rounded-2xl p-2">
      <div className="mb-1 flex items-center justify-between px-2 pt-1">
        <p className="text-sm font-semibold">
          {title}
          {hint ? <span className="ms-2 text-xs font-medium tabular-nums text-muted">{hint}</span> : null}
        </p>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center text-muted">
          <X className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function DealerRow({
  dealer,
  serial,
  lang,
  subtitle,
  meta,
  dual,
  selected,
  onClick,
}: {
  dealer: Dealership;
  serial?: number;
  lang: "en" | "ar";
  subtitle?: string;
  meta?: string;
  dual?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  const name = lang === "ar" && dealer.nameAr ? dealer.nameAr : dealer.nameEn;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2",
        selected && "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "qads-pin-num qads-pin-row shrink-0",
          `qads-pin-${dealer.status}`,
          dealer.flags.trainingStage === "trained" && "qads-pin-trained",
          dual && "qads-pin-dual",
        )}
      >
        {serial ?? ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm font-medium", dual && "text-primary")}>{name}</span>
        {subtitle ? <span className="block truncate text-xs text-muted">{subtitle}</span> : null}
      </span>
      {meta ? <span className="shrink-0 text-xs tabular-nums text-muted">{meta}</span> : null}
    </button>
  );
}
