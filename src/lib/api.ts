import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  DEFAULT_RESEARCH_TASKS,
  SEED_DEALERS,
  CENSUS_STATS,
  CENSUS_VERSION,
  seedId,
  pipelineFromTraining,
  followupFromTraining,
} from "@/lib/seed";
import {
  matchHitToDealer,
  matchQueryToDealer,
  parseLookupLines,
  type MatchableDealer,
} from "@/lib/bulk-match";
import type {
  AgentFinding,
  AppNotification,
  BulkSearchHit,
  Dealership,
  DealershipFlags,
  Followup,
  PhotoRecord,
  PipelineRow,
  PipelineStage,
  ResearchSettings,
  ResearchTask,
  Snapshot,
  SurveyPayload,
  SurveyRecord,
  VisitStatus,
} from "@/lib/types";
import { parseJson, toBool, uid } from "@/lib/utils";
import { ensureWorkspace, joinWorkspace, loadTeam, rotateJoinCode as rotateWorkspaceCode } from "@/lib/workspace";

type DealerRow = {
  id: string;
  name_en: string;
  name_ar: string;
  lat: number | string;
  lng: number | string;
  listed_phone: string;
  seed_note: string;
  status: string;
  flags: string;
  created_at: string;
  updated_at: string;
};
