import { createFileRoute } from "@tanstack/react-router";
import { DossierPage } from "@/components/intel/dossier-page";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/dossier/$id")({
  component: DossierRoute,
});

function DossierRoute() {
  const { id } = Route.useParams();
  return (
    <AppShell>
      <DossierPage dealershipId={id} />
    </AppShell>
  );
}
