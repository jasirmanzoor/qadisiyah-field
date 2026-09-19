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
import { scoped } from "@/lib/api-shared";
import { ensureSeeded } from "@/lib/api-census";
import { loadSnapshot } from "@/lib/api-snapshot";

// Full implementation restored from artifacts/.tmp/qadisiyah-api — do not replace with stubs.
export const bulkSearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { queries: string }) => input)
  .handler(async ({ context, data }) => {
    const { sql, scope, userId } = await scoped(context.userId);
    await ensureSeeded(scope);
    const lines = parseLookupLines(data.queries || "");
    if (lines.length === 0) {
      return { ok: true as const, hits: [] as BulkSearchHit[], snapshot: await loadSnapshot(scope) };
    }
    const dealers = await sql`
      select id, name_en, name_ar, listed_phone, lat, lng, status, flags
      from dealerships
      where workspace_id = ${scope}
    `;
    const matchable: MatchableDealer[] = dealers.map((r: any) => ({
      id: r.id,
      nameEn: r.name_en,
      nameAr: r.name_ar ?? "",
      listedPhone: r.listed_phone ?? "",
      lat: Number(r.lat),
      lng: Number(r.lng),
      status: r.status,
      flags: typeof r.flags === "string" ? JSON.parse(r.flags || "{}") : (r.flags || {}),
    }));
    const hits: BulkSearchHit[] = [];
    for (const q of lines) {
      const m = matchQueryToDealer(q, matchable);
      hits.push({
        id: uid(),
        query: q,
        matchedDealerId: m?.id ?? null,
        confidence: m?.confidence ?? 0,
        reason: m?.reason ?? "no_match",
      });
    }
    return { ok: true as const, hits, snapshot: await loadSnapshot(scope) };
  });
