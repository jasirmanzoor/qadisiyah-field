import { createFileRoute } from "@tanstack/react-router";
import { ResearchPage } from "@/components/research/research-page";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/research")({ component: Research });

function Research() {
  return (
    <AppShell>
      <ResearchPage />
    </AppShell>
  );
}
