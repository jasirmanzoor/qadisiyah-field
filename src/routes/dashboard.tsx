import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}
