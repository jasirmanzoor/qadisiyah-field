'use client';

import { useState } from 'react';
import { useSettings } from '@/lib/settings-context';

export default function LoginPage() {
  const { login } = useSettings();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await login(name.trim());
  };

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-accent-contrast">
            AQ
          </div>
          <h1 className="text-xl font-semibold text-foreground">Al Qadisiyah &amp; Al Shifa Dealership Survey</h1>
          <p className="mt-1 text-sm text-muted">Field intelligence for embedded auto-financing</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Your name (surveyor)
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jasir"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-contrast disabled:opacity-40"
          >
            Start surveying
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          All survey data is stored on this device and works fully offline. Contains
          commercially sensitive dealer information — don&apos;t share this device.
        </p>
      </div>
    </div>
  );
}
