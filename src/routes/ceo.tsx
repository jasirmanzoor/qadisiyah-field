import { createFileRoute } from "@tanstack/react-router";
import { CeoPage } from "@/components/ceo/ceo-page";

export const Route = createFileRoute("/ceo")({ component: CeoPage });
