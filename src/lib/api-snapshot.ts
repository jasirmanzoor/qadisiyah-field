import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type {
  AgentFinding,
  AppNotification,
  Dealership,
  Followup,
  ResearchTask,
  Snapshot,
  SurveyPayload,
} from "@/lib/types";

// NOTE: truncated for this call - WILL FIX
export const pullSnapshot = createServerFn({ method: "GET" }).handler(async () => ({ ok: false }));
