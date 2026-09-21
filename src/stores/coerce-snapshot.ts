import type { Dealership, Snapshot, SurveyRecord } from "@/lib/types";

function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") return Object.values(v as Record<string, T>);
  return [];
}

/** Accepts a Snapshot, a { ok, snapshot } envelope, or a stale cached blob. */
export function coerceSnapshot(raw: unknown): Snapshot {
  const box = (raw ?? {}) as Record<string, unknown>;
  const inner = (box.snapshot && !box.dealerships
    ? (box.snapshot as Record<string, unknown>)
    : box) as Record<string, unknown>;
  const research = (inner.settings ?? inner.research ?? {}) as Record<string, unknown>;
  const dealers = asArray<Dealership>(inner.dealerships).map((d) => ({
    ...d,
    listedPhone: d?.listedPhone ?? "",
    nameEn: d?.nameEn ?? "",
    nameAr: d?.nameAr ?? "",
    lat: Number(d?.lat),
    lng: Number(d?.lng),
    flags: d?.flags && typeof d.flags === "object" ? d.flags : {},
    status: d?.status || "not_visited",
  }));
  return {
    dealerships: dealers,
    surveys: asArray<SurveyRecord>(inner.surveys),
    photos: asArray(inner.photos),
    followups: asArray(inner.followups),
    tasks: asArray(inner.tasks),
    findings: asArray(inner.findings),
    notifications: asArray(inner.notifications),
    pipeline: asArray(inner.pipeline),
    settings: {
      dailyCap: Number(research.dailyCap ?? research.cap ?? 20) || 20,
      runsToday: Number(research.runsToday ?? 0) || 0,
      runsDate: (research.runsDate as string) ?? null,
    },
    team: (inner.team as Snapshot["team"]) ?? { joinCode: "", role: "owner", members: [] },
  };
}
