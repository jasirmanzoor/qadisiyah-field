// @ts-check
/**
 * Pure decision rules for the AI Field Survey Agent.
 *
 * Kept as plain ESM (like `migration-plan.mjs`) so the same code runs in the
 * server pipeline, in the review UI, and under `node --test` without a build
 * step. Nothing here touches the network, the database or the DOM.
 */

/** @typedef {"high" | "medium" | "low" | "unknown"} FieldConfidence */
/** @typedef {"observed" | "estimated" | "needs_review" | "unknown"} ProposalStatus */
/** @typedef {"photo" | "ocr" | "web" | "gps" | "manual" | "derived"} EvidenceSource */
/** @typedef {string | number | boolean | string[] | null} ProposalValue */

/**
 * @typedef {Object} Proposal
 * @property {string} [id]
 * @property {string} fieldKey
 * @property {ProposalValue} value
 * @property {FieldConfidence} confidence
 * @property {ProposalStatus} status
 * @property {EvidenceSource[]} [sourceTypes]
 * @property {string} [reasoning]
 * @property {boolean} [needsVerification]
 * @property {ProposalValue} [existingValue]
 * @property {"accepted" | "rejected" | "edited" | "kept_existing" | null} [decision]
 */

/**
 * Every field the agent may propose, and where it lands in the existing app.
 * `target` is the record the value belongs to; `key` is the EXISTING field
 * name — never rename these without a migration of the survey payload.
 * @type {{ key: string; target: "dealer" | "survey"; field: string; label: string; kind: "text" | "number" | "percent" | "list" | "choice" }[]}
 */
export const AI_FIELDS = [
  { key: "name_en", target: "dealer", field: "nameEn", label: "Showroom name (English)", kind: "text" },
  { key: "name_ar", target: "dealer", field: "nameAr", label: "Showroom name (Arabic)", kind: "text" },
  { key: "vehicle_type", target: "survey", field: "vehicleType", label: "Vehicle type", kind: "choice" },
  { key: "main_brands", target: "survey", field: "mainBrands", label: "Main brands", kind: "list" },
  { key: "inventory_units", target: "survey", field: "inventoryUnits", label: "Visible inventory", kind: "number" },
  { key: "inventory_inside", target: "survey", field: "inventoryInside", label: "Cars inside", kind: "number" },
  { key: "inventory_outside", target: "survey", field: "inventoryOutside", label: "Cars outside", kind: "number" },
  {
    key: "inventory_age_pct_over5",
    target: "survey",
    field: "inventoryAgePctOver5",
    label: "% older than 5 years",
    kind: "percent",
  },
  {
    key: "avg_selling_price_sar",
    target: "survey",
    field: "avgSellingPriceSar",
    label: "Average selling price (SAR)",
    kind: "number",
  },
  { key: "showroom_size_sqm", target: "survey", field: "showroomSizeSqm", label: "Showroom size (m²)", kind: "number" },
  { key: "size_basis", target: "survey", field: "sizeBasis", label: "Size basis", kind: "choice" },
  { key: "salesmen_count", target: "survey", field: "salesmenCount", label: "Salesmen", kind: "number" },
  { key: "finance_available", target: "survey", field: "financeAvailable", label: "Finance available", kind: "choice" },
  { key: "banks_partnered", target: "survey", field: "banksPartnered", label: "Finance providers", kind: "list" },
  { key: "fpr", target: "survey", field: "fpr", label: "Finance penetration rate", kind: "number" },
];

/** @type {Record<string, { target: "dealer" | "survey"; field: string; label: string; kind: string }>} */
const FIELD_INDEX = Object.fromEntries(
  AI_FIELDS.map((f) => [f.key, { target: f.target, field: f.field, label: f.label, kind: f.kind }]),
);

/**
 * Where a proposed field key writes to, or null if the key is unknown
 * (an unknown key must never be written into a production record).
 * @param {string} fieldKey
 */
export function fieldTarget(fieldKey) {
  return FIELD_INDEX[fieldKey] ?? null;
}

/**
 * Empty means "the field user has not answered this yet", so the agent may
 * fill it. 0 and false are real answers and are NOT empty.
 * @param {unknown} v
 */
export function isEmptyValue(v) {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "number") return Number.isNaN(v);
  return false;
}

/**
 * @param {ProposalValue} a
 * @param {ProposalValue} b
 */
export function sameValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const x = [...a].map(String).sort();
    const y = [...b].map(String).sort();
    return x.every((v, i) => v === y[i]);
  }
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (typeof a === "string" && typeof b === "string") return a.trim() === b.trim();
  return a === b;
}

/**
 * The core autofill rule. Empty fields may be prefilled; a field that already
 * carries manual/verified data is never silently overwritten — it becomes a
 * conflict the user resolves.
 *
 * @param {{ proposals: Proposal[]; existing: Record<string, unknown> }} input
 * @returns {{ fills: Proposal[]; conflicts: Proposal[]; ignored: Proposal[] }}
 */
export function planAutofill({ proposals, existing }) {
  /** @type {Proposal[]} */ const fills = [];
  /** @type {Proposal[]} */ const conflicts = [];
  /** @type {Proposal[]} */ const ignored = [];
  for (const p of proposals) {
    const target = fieldTarget(p.fieldKey);
    if (!target || p.value == null || isEmptyValue(p.value)) {
      ignored.push(p);
      continue;
    }
    const current = /** @type {ProposalValue} */ (existing[p.fieldKey] ?? null);
    if (isEmptyValue(current)) fills.push({ ...p, existingValue: null });
    else if (sameValue(current, p.value)) ignored.push({ ...p, existingValue: current });
    else conflicts.push({ ...p, existingValue: current });
  }
  return { fills, conflicts, ignored };
}

/**
 * Only proposals that are high confidence AND observed (not estimated) AND do
 * not collide with an existing value are safe for "accept all".
 * @param {Proposal[]} proposals
 */
export function highConfidenceIds(proposals) {
  return proposals
    .filter(
      (p) =>
        p.confidence === "high" &&
        p.status === "observed" &&
        !isEmptyValue(p.value) &&
        isEmptyValue(p.existingValue ?? null) &&
        !p.decision,
    )
    .map((p) => p.id ?? p.fieldKey);
}

/**
 * Normalise the age split. Percentages must be whole, within 0..100 and sum to
 * ~100; anything else is dropped rather than guessed at.
 * @param {number | null | undefined} over5
 * @param {number | null | undefined} under5
 * @returns {{ over5: number; under5: number } | null}
 */
export function normalizeAgeMix(over5, under5) {
  const a = typeof over5 === "number" && Number.isFinite(over5) ? over5 : null;
  const b = typeof under5 === "number" && Number.isFinite(under5) ? under5 : null;
  let o = a;
  let u = b;
  if (o == null && u == null) return null;
  if (o == null && u != null) o = 100 - u;
  if (u == null && o != null) u = 100 - o;
  if (o == null || u == null) return null;
  if (o < 0 || o > 100 || u < 0 || u > 100) return null;
  if (Math.abs(o + u - 100) > 5) return null;
  const ro = Math.round(o);
  return { over5: ro, under5: 100 - ro };
}

/**
 * Turn accepted proposals into the two patch objects the existing app already
 * knows how to save. Rejected / kept-existing proposals write nothing.
 *
 * @param {{ proposals: Proposal[] }} input
 * @returns {{ dealerPatch: Record<string, ProposalValue>; surveyPatch: Record<string, ProposalValue>; aiFilled: string[] }}
 */
export function buildPatches({ proposals }) {
  /** @type {Record<string, ProposalValue>} */ const dealerPatch = {};
  /** @type {Record<string, ProposalValue>} */ const surveyPatch = {};
  /** @type {string[]} */ const aiFilled = [];
  for (const p of proposals) {
    if (p.decision !== "accepted" && p.decision !== "edited") continue;
    const target = fieldTarget(p.fieldKey);
    if (!target) continue;
    if (isEmptyValue(p.value)) continue;
    if (target.target === "dealer") dealerPatch[target.field] = p.value;
    else surveyPatch[target.field] = p.value;
    aiFilled.push(target.field);
  }
  // Derived companions: keep the app's existing basis/source tagging honest.
  if (surveyPatch.inventoryUnits != null && surveyPatch.inventoryBasis == null) {
    surveyPatch.inventoryBasis = "estimated";
  }
  if (surveyPatch.inventoryAgePctOver5 != null) {
    const mix = normalizeAgeMix(Number(surveyPatch.inventoryAgePctOver5), null);
    if (mix) surveyPatch.inventoryAgePctOver5 = mix.over5;
    else delete surveyPatch.inventoryAgePctOver5;
  }
  if (surveyPatch.showroomSizeSqm != null && surveyPatch.sizeBasis == null) {
    surveyPatch.sizeBasis = "estimated";
  }
  return { dealerPatch, surveyPatch, aiFilled: [...new Set(aiFilled)] };
}

/**
 * GPS resolution. The confirmed device fix wins when the surveyor says they
 * are standing at the showroom; otherwise current device GPS is ignored
 * outright and existing confirmed coordinates are preserved.
 *
 * @param {{
 *   atShowroom: boolean;
 *   device?: { lat: number; lng: number; accuracy?: number } | null;
 *   existing?: { lat: number; lng: number; confirmed?: boolean } | null;
 *   manualPin?: { lat: number; lng: number } | null;
 * }} input
 * @returns {{ lat: number | null; lng: number | null; accuracy: number | null; source: string; status: "confirmed" | "needs_confirmation" | "unresolved"; write: boolean }}
 */
export function resolveGps({ atShowroom, device, existing, manualPin }) {
  const unresolved = {
    lat: null,
    lng: null,
    accuracy: null,
    source: "unknown",
    status: /** @type {const} */ ("unresolved"),
    write: false,
  };
  if (atShowroom && device && Number.isFinite(device.lat) && Number.isFinite(device.lng)) {
    return {
      lat: device.lat,
      lng: device.lng,
      accuracy: typeof device.accuracy === "number" ? device.accuracy : null,
      source: "field_device_gps",
      status: "confirmed",
      write: true,
    };
  }
  if (manualPin && Number.isFinite(manualPin.lat) && Number.isFinite(manualPin.lng)) {
    return {
      lat: manualPin.lat,
      lng: manualPin.lng,
      accuracy: null,
      source: "manual_pin",
      status: "confirmed",
      write: true,
    };
  }
  if (existing && Number.isFinite(existing.lat) && Number.isFinite(existing.lng)) {
    return {
      lat: existing.lat,
      lng: existing.lng,
      accuracy: null,
      source: "existing_confirmed_pin",
      status: existing.confirmed ? "confirmed" : "needs_confirmation",
      write: false,
    };
  }
  return { ...unresolved, status: "needs_confirmation" };
}

export const PHOTO_LIMITS = {
  maxPhotos: 12,
  minPhotos: 1,
  maxBytesPerPhoto: 6 * 1024 * 1024,
  maxTotalBytes: 24 * 1024 * 1024,
};

/**
 * @param {{ sizes: number[] }} input
 * @param {{ maxPhotos?: number; maxBytesPerPhoto?: number; maxTotalBytes?: number }} [limits]
 * @returns {{ ok: true } | { ok: false; error: string }}
 */
export function validatePhotoBatch({ sizes }, limits = {}) {
  const L = { ...PHOTO_LIMITS, ...limits };
  if (!sizes.length) return { ok: false, error: "Upload at least one showroom photo." };
  if (sizes.length > L.maxPhotos) {
    return { ok: false, error: `Too many photos — ${L.maxPhotos} per AI survey run.` };
  }
  if (sizes.some((s) => s > L.maxBytesPerPhoto)) {
    return { ok: false, error: "One photo is too large. Retake or compress it." };
  }
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total > L.maxTotalBytes) return { ok: false, error: "Photo set is too large for one run." };
  return { ok: true };
}

export const RUN_COOLDOWN_MS = 60_000;
export const RUN_STALE_MS = 10 * 60_000;

/**
 * Duplicate-run prevention: a run already in flight blocks a new one until it
 * goes stale, and a just-completed run needs an explicit "Run again".
 *
 * @param {{
 *   lastRun?: { status: string; startedAt: number; completedAt?: number | null } | null;
 *   now: number;
 *   force?: boolean;
 * }} input
 * @returns {{ ok: true } | { ok: false; error: string }}
 */
export function canStartRun({ lastRun, now, force }) {
  if (!lastRun) return { ok: true };
  const running = lastRun.status !== "completed" && lastRun.status !== "failed" && lastRun.status !== "partial";
  if (running && now - lastRun.startedAt < RUN_STALE_MS) {
    return { ok: false, error: "An AI survey is already running for this showroom." };
  }
  if (!force && lastRun.completedAt && now - lastRun.completedAt < RUN_COOLDOWN_MS) {
    return { ok: false, error: "This showroom was just surveyed. Use Run again to repeat it." };
  }
  return { ok: true };
}

/**
 * A finished AI run never by itself completes a showroom.
 * @param {{ mandatoryFilled: number; mandatoryTotal: number; userConfirmed: boolean; gpsResolved: boolean }} input
 * @returns {"needs_review" | "partial" | "complete" | "gps_needs_confirmation"}
 */
export function recommendedStatus({ mandatoryFilled, mandatoryTotal, userConfirmed, gpsResolved }) {
  if (!gpsResolved) return "gps_needs_confirmation";
  if (!userConfirmed) return "needs_review";
  if (mandatoryTotal > 0 && mandatoryFilled >= Math.ceil(mandatoryTotal * 0.8)) return "complete";
  return "partial";
}
