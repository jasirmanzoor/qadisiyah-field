import { createFileRoute } from "@tanstack/react-router";
import { OpsPage } from "@/components/ops/ops-page";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/ops")({ component: Ops });

function Ops() {
  return (
    <AppShell>
      <OpsPage />
    </AppShell>
  );
}
