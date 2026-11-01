'use client';

import { useState } from 'react';

export default function ChipMultiSelect({
  options,
  value,
  onChange,
  freeTextPlaceholder,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  freeTextPlaceholder?: string;
}) {
  const [customText, setCustomText] = useState('');

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const addCustom = () => {
    const t = customText.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setCustomText('');
  };

  const extras = value.filter((v) => !options.includes(v));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full border px-3 py-2 text-sm font-medium ${
              value.includes(opt) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-foreground'
            }`}
          >
            {opt}
          </button>
        ))}
        {extras.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="rounded-full border border-accent bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
          >
            {opt} ✕
          </button>
        ))}
      </div>
      {freeTextPlaceholder && (
        <div className="mt-2 flex gap-2">
          <input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={freeTextPlaceholder}
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-medium text-foreground"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
