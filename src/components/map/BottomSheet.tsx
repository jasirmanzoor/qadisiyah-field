'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Dealership } from '@/lib/types';
import { VISIT_STATUS_COLOR, VISIT_STATUS_LABEL } from '@/lib/types';
import { formatDistance, googleMapsUrl, haversineMeters, telUrl, whatsappUrl } from '@/lib/geo';
import { deleteDealership } from '@/lib/db';

interface BottomSheetProps {
  dealership: Dealership;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onDeleted?: () => void;
  routeMode?: boolean;
  inRoute?: boolean;
  onToggleRoute?: () => void;
}

export default function BottomSheet({
  dealership: d,
  userLocation,
  onClose,
  onDeleted,
  routeMode,
  inRoute,
  onToggleRoute,
}: BottomSheetProps) {
  const router = useRouter();
  const distance = userLocation ? haversineMeters(userLocation, d) : null;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="safe-bottom absolute inset-x-0 bottom-0 z-[1100] rounded-t-2xl border-t border-border bg-surface shadow-2xl">
      <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" />
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: VISIT_STATUS_COLOR[d.visitStatus] }}
              />
              <h2 className="truncate text-base font-semibold text-foreground">{d.nameEn || 'Unnamed'}</h2>
            </div>
            {d.nameAr && (
              <p dir="rtl" className="mt-0.5 truncate text-sm text-muted">
                {d.nameAr}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span>{VISIT_STATUS_LABEL[d.visitStatus]}</span>
              {distance !== null && <span>· {formatDistance(distance)} away</span>}
              {d.listedPhone && <span>· {d.listedPhone}</span>}
              {d.sdId && <span>· {d.sdId}</span>}
              {d.street && <span>· {d.street}</span>}
            </div>
            {d.note && <p className="mt-1 text-xs font-medium text-amber-500">{d.note}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full bg-surface-2 p-2 text-muted" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {routeMode ? (
          <button
            onClick={onToggleRoute}
            className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold ${
              inRoute ? 'bg-accent text-accent-contrast' : 'bg-surface-2 text-foreground'
            }`}
          >
            {inRoute ? '✓ Added to route' : 'Add to route'}
          </button>
        ) : (
          <div className="mt-4 grid grid-cols-4 gap-2">
            <ActionButton href={googleMapsUrl(d.lat, d.lng)} label="Maps" icon="🗺️" />
            <ActionButton href={d.listedPhone ? telUrl(d.listedPhone) : undefined} label="Call" icon="📞" disabled={!d.listedPhone} />
            <ActionButton href={d.listedPhone ? whatsappUrl(d.listedPhone) : undefined} label="WhatsApp" icon="💬" disabled={!d.listedPhone} />
            <ActionButton onClick={() => router.push(`/survey/${d.id}`)} label="Survey" icon="📋" primary />
          </div>
        )}

        {!routeMode && (
          <div className="mt-3 text-center">
            {!confirmingDelete ? (
              <button onClick={() => setConfirmingDelete(true)} className="text-xs text-muted underline">
                Remove this pin
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-muted">Remove &quot;{d.nameEn}&quot; permanently?</span>
                <button
                  onClick={async () => {
                    await deleteDealership(d.id);
                    onClose();
                    onDeleted?.();
                  }}
                  className="font-semibold text-red-500"
                >
                  Remove
                </button>
                <button onClick={() => setConfirmingDelete(false)} className="font-medium text-muted">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  href,
  onClick,
  label,
  icon,
  disabled,
  primary,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: string;
  disabled?: boolean;
  primary?: boolean;
}) {
  const className = `flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium ${
    disabled ? 'bg-surface-2 text-muted/40' : primary ? 'bg-accent text-accent-contrast' : 'bg-surface-2 text-foreground'
  }`;
  const content = (
    <>
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} disabled={disabled} className={className}>
        {content}
      </button>
    );
  }
  if (disabled || !href) {
    return <div className={className}>{content}</div>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  );
}
