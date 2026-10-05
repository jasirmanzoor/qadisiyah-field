import { createFileRoute } from "@tanstack/react-router";
import { DeepdivePage } from "@/components/intel/deepdive-page";
import { AppShell } from "@/components/shell";

type Search = { id: string };

export const Route = createFileRoute("/deepdive")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  component: DeepdiveRoute,
});

function DeepdiveRoute() {
  const { id } = Route.useSearch();
  return (
    <AppShell>
      <DeepdivePage initialId={id} />
    </AppShell>
  );
}
