export const VISIT_STATUSES = [
  "not_visited",
  "partial",
  "completed",
  "refused",
  "closed",
  "competitor",
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const FIGURE_SOURCES = ["observed", "self_reported"] as const;
export type FigureSource = (typeof FIGURE_SOURCES)[number];

export const PIPELINE_STAGES = [
  "surveyed",
  "contacted",
  "pitched",
  "pilot_agreed",
  "onboarded",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type MarketId = "qadisiyah" | "shifa";

export type DealershipFlags = {
  competitor?: boolean;
  complex?: boolean;
  authorised?: boolean;
  authorisedBrand?: string;
  relocated?: boolean;
  financeBiz?: boolean;
  sdId?: string;
  census?: boolean;
  mappingOnly?: boolean;
  credibility?: "high" | "medium" | "low";
  gpsSource?:
    | "survey"
    | "maps_link"
    | "mapping_seed"
    | "interpolated"
    | "related"
    | "outlier_corrected"
    | "field_device_gps"
    | "manual_pin"
    | "existing_confirmed_pin"
    | "public_map"
    | "unknown";
  gpsAccuracy?: number;
  gpsTimestamp?: string;
  gpsStatus?: "confirmed" | "needs_confirmation" | "unresolved";
  lastAiRunAt?: string;
  street?: string;
  mapsUrl?: string;
  censusVersion?: number;
  needsGps?: boolean;
  relatedSdId?: string;
  underProcess?: boolean;
  nameOnly?: boolean;
  trainingPriority?: "active" | "intro" | "scheduled";
  trainingStage?: "trained" | "hold" | "declined" | "unavailable" | "scheduled";
  trainingNote?: string;
  failedSession?: string;
  market?: MarketId;
};

export type Dealership = {
  id: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  listedPhone: string;
  seedNote: string;
  status: VisitStatus;
  flags: DealershipFlags;
  createdAt: string;
  updatedAt: string;
};

export type CensusRow = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  phone: string;
  note: string;
  status: VisitStatus;
  flags: DealershipFlags;
  survey: SurveyPayload;
  step: number;
};

export type SurveyPayload = {
  visitDate?: string;
  surveyorName?: string;
  visitStatus?: VisitStatus;
  crNumber?: string;
  showroomSizeSqm?: number | null;
  sizeBasis?: "measured" | "estimated" | "dealer_stated" | "";
  showroomSizeSource?: FigureSource | "";
  vehicleType?: "new_only" | "used_only" | "mix" | "";
  inventoryAgeMix?: "2020plus" | "2015_2020" | "pre2015" | "wide" | "";
  pocName?: string;
  pocRole?: string;
  pocMobile?: string;
  decisionMaker?: string;
  salesmenCount?: number | null;
  salesmenSource?: FigureSource | "";
  mainBrands?: string[];
  authorisedDealer?: "yes" | "no" | "unclear" | "";
  authorisedBrand?: string;
  inventoryUnits?: number | null;
  inventoryInside?: number | null;
  inventoryOutside?: number | null;
  inventoryAgePctOver5?: number | null;
  inventoryBasis?: "counted" | "estimated" | "dealer_stated" | "";
  inventorySource?: FigureSource | "";
  avgSellingPriceSar?: number | null;
  avgPriceSource?: FigureSource | "";
  avgMonthlySold?: "0_20" | "21_50" | "51_100" | "100plus" | "refused" | "";
  avgMonthlyFinanced?: "0_5" | "6_15" | "16_40" | "40plus" | "refused" | "";
  monthlySoldExact?: number | null;
  monthlyFinancedExact?: number | null;
  fpr?: number | null;
  informationCredibility?: "high" | "medium" | "low" | "";
  street?: string;
  financingLostPerMonth?: string;
  financingLostNumber?: number | null;
  financingLostSource?: FigureSource | "";
  mainFailReason?: string;
  financingWorkaround?: string;
  banksPartnered?: string[];
  bankRepOnSite?: "permanent" | "weekly" | "no" | "";
  buyerMix?: "saudi" | "expat" | "even" | "self_employed" | "";
  leadOnlinePct?: number | null;
  volumeFiguresAre?: "observed" | "self_reported" | "mixed" | "";
  /** AI Field Survey additions — additive, optional, safe for older payloads. */
  financeAvailable?: "yes" | "no" | "unknown" | "";
  financeEvidence?: string;
  aiFilled?: string[];
  aiLastRunId?: string;
  openToPilot?: "yes" | "maybe" | "no" | "too_early" | "";
  notes?: string;
};

export type SurveyRecord = {
  id: string;
  dealershipId: string;
  payload: SurveyPayload;
  step: number;
  updatedAt: string;
};

export type PhotoRecord = {
  id: string;
  dealershipId: string;
  dataUrl: string;
  lat: number | null;
  lng: number | null;
  capturedAt: string;
};

export type Followup = {
  id: string;
  dealershipId: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  createdAt: string;
};

export type ResearchTask = {
  id: string;
  name: string;
  instruction: string;
  targetField: string;
  sources: string[];
  schedule: "on_demand" | "daily" | "weekly";
  enabled: boolean;
};

export type AgentFinding = {
  id: string;
  dealershipId: string;
  taskId: string | null;
  fieldKey: string;
  value: string;
  sourceUrl: string | null;
  confidence: "high" | "medium" | "low";
  retrievedAt: string;
  accepted: boolean | null;
};

export type AppNotification = {
  id: string;
  kind: "change" | "duplicate" | "complex" | "info";
  title: string;
  body: string;
  dealershipId: string | null;
  read: boolean;
  createdAt: string;
};

export type ResearchSettings = {
  dailyCap: number;
  runsToday: number;
  runsDate: string | null;
};

export type PipelineRow = {
  dealershipId: string;
  stage: PipelineStage;
};

export type TeamRole = "owner" | "member";

export type TeamMember = {
  userId: string;
  name: string;
  role: TeamRole;
  you: boolean;
};

export type TeamInfo = {
  joinCode: string;
  role: TeamRole;
  members: TeamMember[];
};

export type BulkSearchHit = {
  id: string;
  query: string;
  nameEn: string;
  nameAr: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  sourceUrl: string | null;
  note: string;
  matchDealershipId: string | null;
};

export type Snapshot = {
  dealerships: Dealership[];
  surveys: SurveyRecord[];
  photos: PhotoRecord[];
  followups: Followup[];
  tasks: ResearchTask[];
  findings: AgentFinding[];
  notifications: AppNotification[];
  settings: ResearchSettings;
  pipeline: PipelineRow[];
  team?: TeamInfo;
};

export const EMPTY_SURVEY: SurveyPayload = {
  mainBrands: [],
  banksPartnered: [],
  leadOnlinePct: 0,
};

/* AI Field Survey Agent */

export const AI_RUN_STAGES = [
  "queued",
  "analyzing_photos",
  "extracting_text",
  "detecting_vehicles",
  "aggregating_evidence",
  "researching",
  "generating_results",
  "completed",
  "partial",
  "failed",
] as const;
export type AiRunStage = (typeof AI_RUN_STAGES)[number];
export type AiRunStatus = "queued" | "running" | "completed" | "partial" | "failed";

export type AiConfidence = "high" | "medium" | "low" | "unknown";
export type AiProposalStatus = "observed" | "estimated" | "needs_review" | "unknown";
export type AiEvidenceSource = "photo" | "ocr" | "web" | "gps" | "manual" | "derived";
export type AiProposalValue = string | number | boolean | string[] | null;
export type AiDecision = "accepted" | "rejected" | "edited" | "kept_existing";

export type AiGps = {
  atShowroom: boolean;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  source: string;
  status: "confirmed" | "needs_confirmation" | "unresolved";
};

export type AiEvidenceRow = {
  id: string;
  runId: string;
  proposalId: string | null;
  fieldKey: string;
  sourceType: AiEvidenceSource;
  photoIndex: number | null;
  sourceUrl: string | null;
  text: string;
  confidence: AiConfidence;
};

export type AiProposal = {
  id: string;
  runId: string;
  dealershipId: string | null;
  fieldKey: string;
  label: string;
  value: AiProposalValue;
  existingValue: AiProposalValue;
  confidence: AiConfidence;
  status: AiProposalStatus;
  sourceTypes: AiEvidenceSource[];
  reasoning: string;
  needsVerification: boolean;
  decision: AiDecision | null;
  evidence: AiEvidenceRow[];
};

export type AiRun = {
  id: string;
  dealershipId: string | null;
  mode: "existing" | "new";
  status: AiRunStatus;
  stage: AiRunStage;
  provider: string;
  model: string;
  photoCount: number;
  gps: AiGps;
  summary: string;
  missingInformation: string[];
  error: string | null;
  applied: boolean;
  startedAt: string;
  completedAt: string | null;
};

export type AiRunBundle = {
  run: AiRun;
  proposals: AiProposal[];
};
