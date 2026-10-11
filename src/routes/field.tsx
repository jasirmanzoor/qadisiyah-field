import { createFileRoute } from "@tanstack/react-router";
import { MapPage } from "@/components/map/map-page";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/field")({ component: Field });

function Field() {
  return (
    <AppShell>
      <MapPage />
    </AppShell>
  );
}
