import { createFileRoute } from "@tanstack/react-router";
import { IntelPage } from "@/components/intel/intel-page";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/research")({ component: Research });

function Research() {
  return (
    <AppShell>
      <IntelPage />
    </AppShell>
  );
}