import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AI_FIELDS,
  buildPatches,
  canStartRun,
  fieldTarget,
  highConfidenceIds,
  isEmptyValue,
  normalizeAgeMix,
  planAutofill,
  recommendedStatus,
  resolveGps,
  sameValue,
  validatePhotoBatch,
} from "./ai-survey-rules.mjs";

/** @param {Partial<import("./ai-survey-rules.mjs").Proposal>} p */
function prop(p) {
  return {
    id: p.fieldKey ?? "x",
    fieldKey: "inventory_units",
    value: 10,
    confidence: "high",
    status: "observed",
    ...p,
  };
}

test("every AI field maps onto an existing app field", () => {
  for (const f of AI_FIELDS) {
    assert.ok(f.field.length > 0);
    assert.ok(f.target === "dealer" || f.target === "survey");
    assert.deepEqual(fieldTarget(f.key)?.field, f.field);
  }
  assert.equal(fieldTarget("not_a_field"), null);
});

test("isEmptyValue treats 0 and false as answers", () => {
  assert.equal(isEmptyValue(null), true);
  assert.equal(isEmptyValue(""), true);
  assert.equal(isEmptyValue("  "), true);
  assert.equal(isEmptyValue([]), true);
  assert.equal(isEmptyValue(0), false);
  assert.equal(isEmptyValue(false), false);
});

test("sameValue compares lists order-insensitively", () => {
  assert.equal(sameValue(["Toyota", "Lexus"], ["Lexus", "Toyota"]), true);
  assert.equal(sameValue(["Toyota"], ["Toyota", "Kia"]), false);
  assert.equal(sameValue(120000, 120000), true);
});

test("AI fills empty fields", () => {
  const { fills, conflicts } = planAutofill({
    proposals: [prop({ fieldKey: "avg_selling_price_sar", value: 118000 })],
    existing: { avg_selling_price_sar: null },
  });
  assert.equal(fills.length, 1);
  assert.equal(conflicts.length, 0);
});

test("manual values are never overwritten — they become conflicts", () => {
  const { fills, conflicts } = planAutofill({
    proposals: [prop({ fieldKey: "avg_selling_price_sar", value: 110000 })],
    existing: { avg_selling_price_sar: 90000 },
  });
  assert.equal(fills.length, 0);
  assert.equal(conflicts.length, 1);
});

test("a proposal identical to the existing value is ignored", () => {
  const { ignored } = planAutofill({
    proposals: [prop({ fieldKey: "avg_selling_price_sar", value: 90000 })],
    existing: { avg_selling_price_sar: 90000 },
  });
  assert.equal(ignored.length, 1);
});

test("unknown field keys are never written", () => {
  const { ignored, fills } = planAutofill({
    proposals: [prop({ fieldKey: "secret_field", value: "x" })],
    existing: {},
  });
  assert.equal(fills.length, 0);
  assert.equal(ignored.length, 1);
  const patches = buildPatches({
    proposals: [prop({ fieldKey: "secret_field", value: "x", decision: "accepted" })],
  });
  assert.deepEqual(patches.dealerPatch, {});
  assert.equal("secret_field" in patches.surveyPatch, false);
});

test("accept-all covers only high-confidence observed proposals with no conflict", () => {
  const ids = highConfidenceIds([
    prop({ id: "a", fieldKey: "inventory_units", confidence: "high", status: "observed", existingValue: null }),
    prop({ id: "b", fieldKey: "name_en", confidence: "medium", status: "observed", value: "X", existingValue: null }),
    prop({ id: "c", fieldKey: "name_ar", confidence: "high", status: "estimated", value: "Y", existingValue: null }),
    prop({ id: "d", fieldKey: "main_brands", confidence: "high", status: "observed", value: ["Toyota"], existingValue: ["Lexus"] }),
  ]);
  assert.deepEqual(ids, ["a"]);
});

test("age percentages must total ~100 or be dropped", () => {
  assert.deepEqual(normalizeAgeMix(30, 70), { over5: 30, under5: 70 });
  assert.equal(normalizeAgeMix(80, 80), null);
  assert.deepEqual(normalizeAgeMix(25, null), { over5: 25, under5: 75 });
});

test("only accepted or edited proposals reach the record", () => {
  const { dealerPatch, surveyPatch } = buildPatches({
    proposals: [
      prop({ fieldKey: "name_en", value: "Wisham", decision: "accepted" }),
      prop({ fieldKey: "inventory_units", value: 26, decision: "edited" }),
      prop({ fieldKey: "name_ar", value: "وشام", decision: "rejected" }),
      prop({ fieldKey: "main_brands", value: ["BMW"], decision: "kept_existing" }),
    ],
  });
  assert.equal(dealerPatch.nameEn, "Wisham");
  assert.equal(surveyPatch.inventoryUnits, 26);
  assert.equal(dealerPatch.nameAr, undefined);
});

test("GPS YES captures the device fix", () => {
  const r = resolveGps({
    atShowroom: true,
    device: { lat: 24.7, lng: 46.8, accuracy: 12 },
    existing: { lat: 24.1, lng: 46.1, confirmed: true },
  });
  assert.equal(r.write, true);
  assert.equal(r.source, "field_device_gps");
  assert.equal(r.lat, 24.7);
});

test("GPS NO ignores the device fix and keeps existing coordinates", () => {
  const r = resolveGps({
    atShowroom: false,
    device: { lat: 24.7, lng: 46.8 },
    existing: { lat: 24.1, lng: 46.1, confirmed: true },
  });
  assert.equal(r.write, false);
  assert.equal(r.source, "existing_confirmed_pin");
  assert.equal(r.lat, 24.1);
});

test("GPS NO with no existing pin never fabricates coordinates", () => {
  const r = resolveGps({ atShowroom: false, device: { lat: 24.7, lng: 46.8 } });
  assert.equal(r.write, false);
  assert.equal(r.lat, null);
});

test("GPS permission denied at the showroom leaves the pin unresolved", () => {
  const r = resolveGps({ atShowroom: true, device: null });
  assert.equal(r.write, false);
  assert.notEqual(r.status, "confirmed");
});

test("a manual pin resolves GPS when the device fix is unavailable", () => {
  const r = resolveGps({
    atShowroom: true,
    device: null,
    manualPin: { lat: 24.72, lng: 46.81 },
  });
  assert.equal(r.write, true);
  assert.equal(r.source, "manual_pin");
  assert.equal(r.lat, 24.72);
});

test("photo batch limits", () => {
  assert.equal(validatePhotoBatch({ sizes: [] }).ok, false);
  assert.equal(validatePhotoBatch({ sizes: [1000] }).ok, true);
  assert.equal(validatePhotoBatch({ sizes: Array(13).fill(100) }).ok, false);
  assert.equal(validatePhotoBatch({ sizes: [7 * 1024 * 1024] }).ok, false);
});

test("duplicate runs are blocked while one is in flight", () => {
  const now = 1_000_000;
  const blocked = canStartRun({ lastRun: { status: "running", startedAt: now - 1000 }, now });
  assert.equal(blocked.ok, false);
  const fresh = canStartRun({ lastRun: null, now });
  assert.equal(fresh.ok, true);
});

test("a finished run never completes a showroom on its own", () => {
  assert.equal(
    recommendedStatus({ mandatoryFilled: 10, mandatoryTotal: 10, userConfirmed: false, gpsResolved: true }),
    "needs_review",
  );
  assert.equal(
    recommendedStatus({ mandatoryFilled: 10, mandatoryTotal: 10, userConfirmed: true, gpsResolved: false }),
    "gps_needs_confirmation",
  );
});
