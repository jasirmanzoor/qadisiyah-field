import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({
  children,
  hint,
  className,
}: {
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-medium text-fg">{children}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-xl bg-surface px-4 text-base text-fg shadow-[var(--shadow-border)] placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full resize-y rounded-xl bg-surface px-4 py-3 text-base text-fg shadow-[var(--shadow-border)] placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Choice({
  options,
  value,
  onChange,
  columns = 1,
}: {
  options: { id: string; label: string }[];
  value: string | undefined | null;
  onChange: (id: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "min-h-12 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-150",
              active ? "bg-primary text-primary-fg" : "bg-surface text-fg shadow-[var(--shadow-border)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SourceToggle({
  value,
  onChange,
}: {
  value: string | undefined | null;
  onChange: (v: "observed" | "self_reported") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
      {(
        [
          ["observed", "Observed"],
          ["self_reported", "Self-reported"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "min-h-10 rounded-lg text-sm font-medium",
            value === id ? "bg-primary text-primary-fg" : "text-muted",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function ChipMulti({
  options,
  value,
  onChange,
  allowCustom,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              className={cn(
                "min-h-10 rounded-full px-3 text-sm font-medium",
                on ? "bg-primary text-primary-fg" : "bg-surface text-fg shadow-[var(--shadow-border)]",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {allowCustom ? (
        <Input
          placeholder="Add other…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = (e.target as HTMLInputElement).value.trim();
              if (v && !value.includes(v)) onChange([...value, v]);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    not_visited: "bg-status-grey/15 text-status-grey",
    partial: "bg-status-amber/15 text-status-amber",
    completed: "bg-status-green/15 text-status-green",
    refused: "bg-status-red/15 text-status-red",
    closed: "bg-status-red/15 text-status-red",
    competitor: "bg-status-purple/15 text-status-purple",
  };
  return (
    <span className={cn("inline-flex min-h-8 items-center rounded-full px-3 text-xs font-medium", color[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

export function TrainingBadge({
  stage,
  priority,
  label,
}: {
  stage?: string;
  priority?: string;
  label: string;
}) {
  if (!stage && !priority) return null;
  const tone =
    stage === "trained"
      ? "bg-status-green/15 text-status-green"
      : stage === "hold" || stage === "scheduled" || priority === "scheduled"
        ? "bg-status-amber/15 text-status-amber"
        : stage === "declined" || stage === "unavailable"
          ? "bg-status-red/15 text-status-red"
          : "bg-surface-2 text-muted";
  return (
    <span className={cn("inline-flex min-h-8 items-center rounded-full px-3 text-xs font-medium", tone)}>
      {label}
    </span>
  );
}

export function FigureBadge({ source }: { source?: string | null }) {
  const map: Record<string, string> = {
    observed: "bg-status-green/15 text-status-green",
    self_reported: "bg-status-amber/15 text-status-amber",
    mixed: "bg-status-amber/15 text-status-amber",
    untagged: "bg-surface-2 text-muted",
  };
  const key = source && map[source] ? source : "untagged";
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-2 text-[11px] font-medium uppercase tracking-wide", map[key])}>
      {key.replace("_", " ")}
    </span>
  );
}
