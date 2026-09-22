import { create } from "zustand";
import {
  addPhoto as apiAddPhoto,
  bulkSearch as apiBulkSearch,
  deletePhoto as apiDeletePhoto,
  joinTeam as apiJoinTeam,
  markNotificationRead as apiMarkRead,
  pullSnapshot,
  rotateJoinCode as apiRotateCode,
  runResearch,
  setFindingAccepted as apiSetFinding,
  setPipelineStage as apiSetPipeline,
  updateResearchCap,
  upsertDealership as apiUpsertDealer,
  upsertFollowup as apiUpsertFollowup,
  upsertSurvey as apiUpsertSurvey,
  upsertTask as apiUpsertTask,
} from "@/lib/api";
import { enqueue, listQueue, loadLocalSnapshot, queueCount, removeQueue, saveLocalSnapshot } from "@/lib/offline";
import { inferStatus } from "@/lib/survey-schema";
import type {
  BulkSearchHit,
  Dealership,
  DealershipFlags,
  Followup,
  PhotoRecord,
  PipelineStage,
  ResearchTask,
  Snapshot,
  SurveyPayload,
  SurveyRecord,
  VisitStatus,
} from "@/lib/types";
import { EMPTY_SURVEY, isProtectedGps } from "@/lib/types";
import { uid } from "@/lib/utils";
import { coerceSnapshot } from "./coerce-snapshot";

const EMPTY: Snapshot = {
  dealerships: [],
  surveys: [],
  photos: [],
  followups: [],
  tasks: [],
  findings: [],
  notifications: [],
  settings: { dailyCap: 20, runsToday: 0, runsDate: null },
  pipeline: [],
  team: { joinCode: "", role: "owner", members: [] },
};

type Gps = { lat: number; lng: number; accuracy: number } | null;

type FieldState = {
  snapshot: Snapshot;
  loaded: boolean;
  hydrating: boolean;
  online: boolean;
  pending: number;
  syncing: boolean;
  gps: Gps;
  gpsError: boolean;
  lastError: string | null;
  hydrate: () => Promise<void>;
  flush: () => Promise<void>;
  setOnline: (v: boolean) => void;
  setGps: (g: Gps) => void;
  setGpsError: (v: boolean) => void;
  upsertDealer: (d: Dealership) => Promise<void>;
  patchSurvey: (
    dealershipId: string,
    patch: Partial<SurveyPayload>,
    step?: number,
    statusOverride?: VisitStatus,
  ) => Promise<void>;
  addPhoto: (p: PhotoRecord) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  upsertFollowup: (f: Followup) => Promise<void>;
  upsertTask: (t: ResearchTask) => Promise<void>;
  setFinding: (id: string, accepted: boolean) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  setStage: (dealershipId: string, stage: PipelineStage) => Promise<void>;
  setCap: (n: number) => Promise<void>;
  joinTeam: (code: string) => Promise<{ ok: boolean; error?: string }>;
  rotateCode: () => Promise<{ ok: boolean; error?: string }>;
  runAgent: (dealershipIds: string[], taskIds: string[]) => Promise<{ ok: boolean; error?: string; used?: number }>;
  bulkSearch: (
    mode: "discover" | "lookup",
    query: string,
  ) => Promise<{
    ok: boolean;
    error?: string;
    warning?: string;
    hits?: BulkSearchHit[];
    charged?: number;
  }>;
};

function persist(snapshot: Snapshot) {
  void saveLocalSnapshot(snapshot);
}

function pickGpsFlags(flags: DealershipFlags | undefined): Partial<DealershipFlags> {
  if (!flags) return {};
  return {
    gpsSource: flags.gpsSource,
    gpsStatus: flags.gpsStatus,
    gpsTimestamp: flags.gpsTimestamp,
    gpsAccuracy: flags.gpsAccuracy,
    needsGps: flags.needsGps,
    mapsUrl: flags.mapsUrl,
  };
}

function gpsStamp(d: Dealership): number {
  return Date.parse(d.flags?.gpsTimestamp || d.updatedAt || "") || 0;
}

function keepLocalGps(local: Dealership, remote: Dealership): Dealership {
  if (local.lat === remote.lat && local.lng === remote.lng) {
    if (isProtectedGps(local.flags) && !isProtectedGps(remote.flags)) {
      return { ...remote, flags: { ...remote.flags, ...pickGpsFlags(local.flags) } };
    }
    return remote;
  }
  const localProtected = isProtectedGps(local.flags);
  const remoteProtected = isProtectedGps(remote.flags);
  if (localProtected && (!remoteProtected || gpsStamp(local) >= gpsStamp(remote))) {
    return {
      ...remote,
      lat: local.lat,
      lng: local.lng,
      flags: { ...remote.flags, ...pickGpsFlags(local.flags) },
      updatedAt: local.updatedAt,
    };
  }
  if (!remoteProtected && gpsStamp(local) > gpsStamp(remote)) {
    return {
      ...remote,
      lat: local.lat,
      lng: local.lng,
      flags: { ...remote.flags, ...pickGpsFlags(local.flags) },
      updatedAt: local.updatedAt,
    };
  }
  return remote;
}

function pendingDealerIdsFromQueue(items: { op: string; payload: unknown }[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.op !== "upsertDealership") continue;
    const raw = item.payload as Dealership & { dealer?: Dealership };
    const d = raw?.dealer ?? raw;
    if (d?.id) ids.add(d.id);
    if (d?.flags?.sdId) ids.add(d.flags.sdId);
  }
  return ids;
}

function mergeSnapshot(local: Snapshot, remote: Snapshot, pendingIds: Set<string>): Snapshot {
  const localById = new Map(local.dealerships.map((d) => [d.id, d]));
  const localBySd = new Map(
    local.dealerships.filter((d) => d.flags?.sdId).map((d) => [d.flags.sdId as string, d]),
  );
  const seen = new Set<string>();
  const dealerships = remote.dealerships.map((r) => {
    seen.add(r.id);
    const l = localById.get(r.id) ?? (r.flags?.sdId ? localBySd.get(r.flags.sdId) : undefined);
    if (!l) return r;
    const pending =
      pendingIds.has(r.id) ||
      pendingIds.has(l.id) ||
      (r.flags?.sdId ? pendingIds.has(r.flags.sdId) : false) ||
      (l.flags?.sdId ? pendingIds.has(l.flags.sdId) : false);
    if (pending) {
      return {
        ...r,
        lat: l.lat,
        lng: l.lng,
        flags: { ...r.flags, ...pickGpsFlags(l.flags) },
        updatedAt: l.updatedAt,
      };
    }
    return keepLocalGps(l, r);
  });
  for (const l of local.dealerships) {
    if (!seen.has(l.id)) dealerships.push(l);
  }
  return { ...remote, dealerships };
}

export const useField = create<FieldState>((set, get) => ({
  snapshot: EMPTY,
  loaded: false,
  hydrating: false,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  pending: 0,
  syncing: false,
  gps: null,
  gpsError: false,
  lastError: null,

  setOnline: (v) => {
    set({ online: v });
    if (v) void get().flush();
  },
  setGps: (g) => set({ gps: g, gpsError: false }),
  setGpsError: (v) => set({ gpsError: v }),

  hydrate: async () => {
    if (get().hydrating) return;
    set({ hydrating: true });
    const local = await loadLocalSnapshot().catch(() => null);
    const pending = await queueCount().catch(() => 0);
    const memory = get().snapshot;
    const localSnap =
      memory.dealerships.length > 0
        ? memory
        : local
          ? coerceSnapshot(local)
          : null;
    if (localSnap) set({ snapshot: localSnap, loaded: true, pending });
    try {
      const joinCode = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("qads-join") : null;
      if (joinCode) {
        sessionStorage.removeItem("qads-join");
        const joined = await apiJoinTeam({ data: { code: joinCode } });
        if (joined.ok && "snapshot" in joined) {
          const snap = coerceSnapshot(joined.snapshot);
          set({ snapshot: snap, loaded: true, lastError: null });
          persist(snap);
          await get().flush();
          return;
        }
      }
      // Push any Save-pin writes first so the server copy is the one we just saved.
      await get().flush();
      const remote = coerceSnapshot(await pullSnapshot());
      const queued = await listQueue().catch(() => []);
      const pendingIds = pendingDealerIdsFromQueue(queued);
      const current = get().snapshot;
      const merged =
        current.dealerships.length > 0
          ? mergeSnapshot(current, remote, pendingIds)
          : remote;
      set({ snapshot: merged, loaded: true, lastError: null });
      persist(merged);
      await get().flush();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      set({ lastError: msg, loaded: true, pending });
    } finally {
      set({ hydrating: false });
    }
  },

  flush: async () => {
    if (!get().online || get().syncing) return;
    set({ syncing: true });
    try {
      const items = await listQueue();
      for (const item of items) {
        try {
          switch (item.op) {
            case "upsertDealership": {
              const raw = item.payload as Dealership & { dealer?: Dealership };
              const dealer = raw?.dealer ?? raw;
              await apiUpsertDealer({ data: dealer });
              break;
            }
            case "upsertSurvey":
              await apiUpsertSurvey({
                data: item.payload as { survey: SurveyRecord; status: VisitStatus },
              });
              break;
            case "addPhoto":
              await apiAddPhoto({ data: item.payload as PhotoRecord });
              break;
            case "deletePhoto":
              await apiDeletePhoto({ data: item.payload as { id: string } });
              break;
            case "upsertFollowup":
              await apiUpsertFollowup({ data: item.payload as Followup });
              break;
            case "upsertTask":
              await apiUpsertTask({ data: item.payload as ResearchTask });
              break;
            case "setFindingAccepted":
              await apiSetFinding({ data: item.payload as { id: string; accepted: boolean } });
              break;
            case "markNotificationRead":
              await apiMarkRead({ data: item.payload as { id: string } });
              break;
            case "setPipelineStage":
              await apiSetPipeline({
                data: item.payload as { dealershipId: string; stage: PipelineStage },
              });
              break;
            default:
              break;
          }
          await removeQueue(item.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (message === "Unauthorized") throw err;
          break;
        }
      }
      set({ pending: await queueCount() });
    } finally {
      set({ syncing: false });
    }
  },

  upsertDealer: async (d) => {
    const snapshot = get().snapshot;
    const exists = snapshot.dealerships.some((x) => x.id === d.id);
    const dealerships = exists
      ? snapshot.dealerships.map((x) => (x.id === d.id ? d : x))
      : [...snapshot.dealerships, d];
    const next = { ...snapshot, dealerships };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "upsertDealership", payload: d });
    set({ pending: await queueCount() });
    await get().flush();
  },

  patchSurvey: async (dealershipId, patch, step, statusOverride) => {
    const snapshot = get().snapshot;
    const rows = Array.isArray(snapshot.surveys) ? snapshot.surveys : [];
    const existing = rows.find((s) => s.dealershipId === dealershipId);
    const payload: SurveyPayload = { ...EMPTY_SURVEY, ...(existing?.payload ?? {}), ...patch };
    const dealer = snapshot.dealerships.find((d) => d.id === dealershipId);
    const status: VisitStatus =
      statusOverride ?? inferStatus(payload, payload.visitStatus ?? dealer?.status ?? "not_visited");
    payload.visitStatus = status;
    const survey: SurveyRecord = {
      id: existing?.id ?? uid(),
      dealershipId,
      payload,
      step: step ?? existing?.step ?? 0,
      updatedAt: new Date().toISOString(),
    };
    const surveys = existing
      ? rows.map((s) => (s.dealershipId === dealershipId ? survey : s))
      : [...rows, survey];
    const dealerships = snapshot.dealerships.map((d) =>
      d.id === dealershipId ? { ...d, status, updatedAt: survey.updatedAt } : d,
    );
    const next = { ...snapshot, surveys, dealerships };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "upsertSurvey", payload: { survey, status } });
    set({ pending: await queueCount() });
    void get().flush();
  },

  addPhoto: async (p) => {
    const snapshot = get().snapshot;
    const next = { ...snapshot, photos: [...snapshot.photos, p] };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "addPhoto", payload: p });
    set({ pending: await queueCount() });
    void get().flush();
  },

  removePhoto: async (id) => {
    const snapshot = get().snapshot;
    const next = { ...snapshot, photos: snapshot.photos.filter((p) => p.id !== id) };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "deletePhoto", payload: { id } });
    set({ pending: await queueCount() });
    void get().flush();
  },

  upsertFollowup: async (f) => {
    const snapshot = get().snapshot;
    const exists = snapshot.followups.some((x) => x.id === f.id);
    const followups = exists
      ? snapshot.followups.map((x) => (x.id === f.id ? f : x))
      : [f, ...snapshot.followups];
    const next = { ...snapshot, followups };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "upsertFollowup", payload: f });
    set({ pending: await queueCount() });
    void get().flush();
  },

  upsertTask: async (t) => {
    const snapshot = get().snapshot;
    const exists = snapshot.tasks.some((x) => x.id === t.id);
    const tasks = exists ? snapshot.tasks.map((x) => (x.id === t.id ? t : x)) : [...snapshot.tasks, t];
    const next = { ...snapshot, tasks };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "upsertTask", payload: t });
    set({ pending: await queueCount() });
    void get().flush();
  },

  setFinding: async (id, accepted) => {
    const snapshot = get().snapshot;
    const next = {
      ...snapshot,
      findings: snapshot.findings.map((f) => (f.id === id ? { ...f, accepted } : f)),
    };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "setFindingAccepted", payload: { id, accepted } });
    set({ pending: await queueCount() });
    void get().flush();
  },

  markRead: async (id) => {
    const snapshot = get().snapshot;
    const next = {
      ...snapshot,
      notifications: snapshot.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "markNotificationRead", payload: { id } });
    set({ pending: await queueCount() });
    void get().flush();
  },

  setStage: async (dealershipId, stage) => {
    const snapshot = get().snapshot;
    const exists = snapshot.pipeline.some((p) => p.dealershipId === dealershipId);
    const pipeline = exists
      ? snapshot.pipeline.map((p) => (p.dealershipId === dealershipId ? { ...p, stage } : p))
      : [...snapshot.pipeline, { dealershipId, stage }];
    const next = { ...snapshot, pipeline };
    set({ snapshot: next });
    persist(next);
    await enqueue({ id: uid(), op: "setPipelineStage", payload: { dealershipId, stage } });
    set({ pending: await queueCount() });
    void get().flush();
  },

  setCap: async (n) => {
    const res = await updateResearchCap({ data: { cap: n } as { cap: number } });
    const snapshot = get().snapshot;
    set({
      snapshot: {
        ...snapshot,
        settings: { ...snapshot.settings, dailyCap: n },
      },
    });
  },

  joinTeam: async (code) => {
    try {
      const res = await apiJoinTeam({ data: { code } });
      if (!res.ok) return { ok: false, error: res.error };
      const snap = coerceSnapshot(res.snapshot);
      set({ snapshot: snap, loaded: true, lastError: null });
      persist(snap);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Join failed" };
    }
  },

  rotateCode: async () => {
    try {
      const res = await apiRotateCode();
      if (!res.ok) return { ok: false, error: res.error };
      const snap = coerceSnapshot(res.snapshot);
      set({ snapshot: snap, lastError: null });
      persist(snap);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not rotate" };
    }
  },

  runAgent: async (dealershipIds, taskIds) => {
    try {
      const res = await runResearch({ data: { dealershipIds, taskIds } });
      if (!res.ok) return { ok: false, error: res.error };
      await get().hydrate();
      return { ok: true, used: res.runsToday };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Research failed" };
    }
  },

  bulkSearch: async (mode, query) => {
    try {
      const res = await apiBulkSearch({ data: { mode, query } });
      if (!res.ok) return { ok: false, error: res.error };
      const snapshot = get().snapshot;
      const warning = "warning" in res && typeof res.warning === "string" ? res.warning : undefined;
      set({
        snapshot: {
          ...snapshot,
          settings: {
            ...snapshot.settings,
            dailyCap: res.cap,
            runsToday: res.runsToday,
          },
        },
      });
      return { ok: true, hits: res.hits, charged: res.charged, warning };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Bulk search failed" };
    }
  },
}));

export function surveyFor(snapshot: Snapshot, id: string): SurveyRecord | undefined {
  const rows = Array.isArray(snapshot.surveys) ? snapshot.surveys : [];
  return rows.find((s) => s.dealershipId === id);
}
