'use client';

import type { ReactNode } from 'react';

export function Field({
  label,
  required,
  highlight,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  highlight?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={highlight ? 'rounded-xl border border-amber-500/40 bg-amber-500/5 p-3' : ''}>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500">*</span>}
        {highlight && (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
            High priority
          </span>
        )}
      </label>
      {hint && <p className="mb-1.5 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none focus:border-accent"
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none focus:border-accent"
    />
  );
}

export function NumberInput({
  value,
  onValueChange,
  placeholder,
  min,
  max,
}: {
  value: number | null;
  onValueChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      min={min}
      max={max}
      placeholder={placeholder}
      onChange={(e) => onValueChange(e.target.value === '' ? null : Number(e.target.value))}
      className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none focus:border-accent"
    />
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'border-accent bg-accent text-accent-contrast'
              : 'border-border bg-surface text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
