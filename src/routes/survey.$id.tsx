import { createFileRoute } from "@tanstack/react-router";
import { SurveyWizard } from "@/components/survey/survey-wizard";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/survey/$id")({ component: Survey });

function Survey() {
  const { id } = Route.useParams();
  return (
    <AppShell>
      <SurveyWizard dealershipId={id} />
    </AppShell>
  );
}
