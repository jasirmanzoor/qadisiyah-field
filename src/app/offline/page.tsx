export default function OfflinePage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <div className="text-4xl">📡</div>
      <h1 className="text-lg font-semibold text-foreground">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted">
        This page hasn&apos;t been cached yet. Anything you&apos;ve already opened — the map,
        survey forms, dashboard — still works without a connection. Reconnect briefly to
        load new pages.
      </p>
    </div>
  );
}
