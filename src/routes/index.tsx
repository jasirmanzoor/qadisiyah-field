import { createFileRoute } from "@tanstack/react-router";
import { MarketTour } from "@/components/tour/market-tour";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <MarketTour />
    </AppShell>
  );
}
