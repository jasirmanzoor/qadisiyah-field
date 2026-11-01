'use client';

interface BasisToggleProps {
  basis: 'observed' | 'self_reported' | null;
  onChange: (basis: 'observed' | 'self_reported' | null) => void;
  disabled?: boolean;
}

export default function BasisToggle({ basis, onChange, disabled }: BasisToggleProps) {
  return (
    <div className="mt-2 flex gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(basis === 'observed' ? null : 'observed')}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          basis === 'observed'
            ? 'bg-emerald-500 text-white'
            : 'bg-emerald-500/10 text-emerald-500'
        } ${disabled ? 'opacity-40' : ''}`}
      >
        👁 Observed
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(basis === 'self_reported' ? null : 'self_reported')}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          basis === 'self_reported'
            ? 'bg-amber-500 text-white'
            : 'bg-amber-500/10 text-amber-500'
        } ${disabled ? 'opacity-40' : ''}`}
      >
        🗣 Self-reported
      </button>
    </div>
  );
}
