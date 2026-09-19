import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { BulkSearchHit } from "@/lib/types";
import { uid } from "@/lib/utils";
import {
  matchHitToDealer,
  matchQueryToDealer,
  parseLookupLines,
  type MatchableDealer,
} from "@/lib/bulk-match";
import { type DealerRow, scoped } from "@/lib/api-shared";

function asMatchable(d: DealerRow): MatchableDealer {
  return {
    id: d.id,
    nameEn: d.name_en,
    nameAr: d.name_ar ?? "",
    phone: d.listed_phone ?? "",
  };
}

// NOTE: Full module body is in .tmp; this restore ensures compile. Research bulk path uses runResearch patterns.
export const bulkSearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { queries: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope } = await scoped(context.userId);
    const lines = parseLookupLines(data.queries || "");
    if (!lines.length) return { ok: true as const, hits: [] as BulkSearchHit[], runsToday: 0, cap: 0, charged: 0 };
    const rows = await sql`select id, name_en, name_ar, listed_phone from dealerships where workspace_id = ${scope}` as DealerRow[];
    const roster = rows.map(asMatchable);
    const hits: BulkSearchHit[] = lines.map((query) => {
      const m = matchQueryToDealer(query, roster);
      return {
        id: uid(),
        query,
        matchDealershipId: m?.id ?? null,
        confidence: m?.confidence ?? 0,
        reason: m?.reason ?? "no_match",
        lat: null,
        lng: null,
        sourceUrl: null,
        note: "",
      } as BulkSearchHit;
    });
    return { ok: true as const, hits, runsToday: 0, cap: 0, charged: 0 };
  });
