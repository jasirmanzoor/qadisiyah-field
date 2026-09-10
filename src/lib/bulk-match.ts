export type MatchableDealer = {
  id: string;
  nameEn: string;
  nameAr: string;
  phone: string;
};

export function foldName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function lastDigits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-9);
}

export function parseLookupLines(query: string): string[] {
  const lines = query
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = foldName(line) || lastDigits(line) || line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  return unique.slice(0, 40);
}

function namesClose(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

export function matchQueryToDealer(query: string, dealers: MatchableDealer[]): MatchableDealer | null {
  const q = query.trim();
  if (!q) return null;
  const digits = lastDigits(q);
  if (digits.length >= 8) {
    const byPhone = dealers.find((d) => lastDigits(d.phone) === digits);
    if (byPhone) return byPhone;
  }
  const f = foldName(q);
  if (f.length < 3) return null;
  let best: MatchableDealer | null = null;
  let bestScore = 0;
  for (const d of dealers) {
    const dn = foldName(d.nameEn);
    const da = foldName(d.nameAr);
    let score = 0;
    if (dn === f || da === f) return d;
    if (namesClose(f, dn) || namesClose(f, da)) score = 2;
    else if (f.length >= 6 && (dn.startsWith(f) || da.startsWith(f))) score = 1;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

export function matchHitToDealer(
  hit: { nameEn: string; nameAr: string; phone: string },
  dealers: MatchableDealer[],
): string | null {
  const hitPhone = lastDigits(hit.phone);
  if (hitPhone.length >= 8) {
    const byPhone = dealers.find((d) => lastDigits(d.phone) === hitPhone);
    if (byPhone) return byPhone.id;
  }
  const found = matchQueryToDealer(hit.nameEn || hit.nameAr, dealers);
  return found?.id ?? null;
}
