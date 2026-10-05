import { createFileRoute } from "@tanstack/react-router";
import { CeoPage } from "@/components/intel/ceo-page";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/ceo")({
  component: CeoRoute,
});

function CeoRoute() {
  return (
    <AppShell>
      <CeoPage />
    </AppShell>
  );
}
