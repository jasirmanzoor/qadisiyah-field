// Phase 2 — Research Agent: types for user-defined research tasks, the
// agent-sourced findings they produce, and run/cost bookkeeping.
//
// Findings are a layer that sits alongside (never overwrites) the
// field-collected Dealership record — see AgentFinding below.

export type ResearchSchedule = 'on_demand' | 'daily' | 'weekly';

/** Window event fired when research tasks are added/edited, so other panels refresh. */
export const RESEARCH_TASKS_CHANGED = 'research-tasks-changed';

/** Which dealerships a batch or scheduled run covers. */
export type ResearchScope = 'all' | 'not_visited' | 'missing_cr';

export type ResearchTargetField =
  | 'crNumber'
  | 'listedPhone'
  | 'mainBrands'
  | 'authorised'
  | 'socialPresence' // free-text: Instagram/X/WhatsApp Business handles found
  | 'reviewsNote' // free-text: customer reviews mentioning financing/instalments
  | 'noteAppend'; // free-text: anything else, appended to the agent notes

export const RESEARCH_SOURCES = [
  'Google Maps / Google Business',
  'Saudi marketplaces (Haraj, Motory, OpenSooq, Syarah, YallaMotor, Soum)',
  'Instagram',
  'X (Twitter)',
  'WhatsApp Business',
  'Saudi Ministry of Commerce registry',
] as const;
export type ResearchSource = (typeof RESEARCH_SOURCES)[number];

export interface ResearchTask {
  id: string;
  name: string;
  instruction: string; // natural-language instruction, e.g. "Find their CR number"
  targetField: ResearchTargetField;
  sources: ResearchSource[];
  schedule: ResearchSchedule;
  /** Dealerships a scheduled run covers. Older tasks without it mean 'all'. */
  scope?: ResearchScope;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
}

export type FindingConfidence = 'high' | 'medium' | 'low';
export type FindingStatus = 'pending' | 'applied' | 'rejected';

export interface AgentFinding {
  id: string;
  dealershipId: string;
  taskId: string;
  taskName: string;
  targetField: ResearchTargetField;
  found: boolean;
  value: string | null;
  summary: string;
  sourceUrl: string | null;
  confidence: FindingConfidence;
  model: string;
  retrievedAt: string;
  status: FindingStatus;
  /** Set when this finding's value differs from the immediately prior finding for the same dealership+field — powers the change-detection notifications feed. */
  changedFromPrevious: boolean;
  previousValue: string | null;
  /** Actual billed cost of the run that produced this finding. */
  costUsd?: number;
  /** User cleared the "changed" alert without accepting/rejecting the finding. */
  alertDismissed?: boolean;
}

export interface ResearchRunLogEntry {
  id: string;
  ranAt: string;
  taskId: string;
  dealershipId: string;
  ok: boolean;
  error: string | null;
  /** Rough cost estimate in USD for this single run, for the daily-cap/cost-tracking UI. */
  estimatedCostUsd: number;
}

export interface DuplicateFlag {
  id: string;
  dealershipIdA: string;
  dealershipIdB: string;
  reason: string; // e.g. "exact name match", "name+GPS within 40m"
  distanceMeters: number | null;
  createdAt: string;
  status: 'pending' | 'dismissed' | 'merged';
}
