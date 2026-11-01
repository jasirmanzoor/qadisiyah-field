import { haversineMeters } from './geo';
import type { Dealership } from './types';
import { marketOf } from './markets';
import type { DuplicateFlag } from './research-types';

const GENERIC_WORDS = new Set([
  'car', 'cars', 'company', 'co', 'showroom', 'for', 'group', 'ltd', 'trading',
  'commercial', 'exhibition', 'of', 'the', 'excellence', 'est', 'establishment',
  'branch', 'extension', 'outstore', 'and', 'motors', 'auto', 'autos',
]);

// Place words are in half the names in this market, so they can't be the
// only thing two names share.
const PLACE_WORDS = new Set(['riyadh', 'qadisiyah', 'qadisiya', 'qadisiyyah', 'qadsiah', 'najd', 'saudi', 'ksa', 'east']);

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^(al|el)(?=[a-z]{3,})/, '')) // "Alriyadh" → "riyadh"
    .filter((w) => w && w !== 'al' && w !== 'el' && !/^\d+$/.test(w) && !GENERIC_WORDS.has(w));
}

export function normaliseName(name: string): string {
  return Array.from(new Set(nameTokens(name))).sort().join(' ').trim();
}

/**
 * Whole-token comparison (so "Hala" never matches inside "Shalal"): exact
 * token-set match, or every token of the shorter name appears in the longer
 * one — and the shared tokens must include something besides a place name.
 */
export function englishNameMatch(a: string, b: string): 'exact' | 'overlap' | null {
  const ta = new Set(normaliseName(a).split(' ').filter(Boolean));
  const tb = new Set(normaliseName(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return null;
  const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  const distinctive = [...small].filter((t) => !PLACE_WORDS.has(t));
  if (distinctive.length === 0 || distinctive.join('').length < 3) return null;
  if (![...small].every((t) => large.has(t))) return null;
  return small.size === large.size ? 'exact' : 'overlap';
}

const GENERIC_WORDS_AR = new Set([
  'معرض', 'معارض', 'سيارات', 'للسيارات', 'شركة', 'شركه', 'مؤسسة', 'مؤسسه', 'مجموعة', 'مجموعه',
  'التجارية', 'التجاريه', 'تجارة', 'لتجارة', 'فرع', 'و',
]);

/** Arabic: strip diacritics/tatweel, unify alef, ya, ta marbuta forms, drop generic words. */
export function normaliseArabicName(name: string): string {
  return (name ?? '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A0-9\u0660-\u0669 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !GENERIC_WORDS_AR.has(w) && !GENERIC_WORDS_AR.has(w.replace(/ه$/, 'ة')))
    .join(' ')
    .trim();
}

/** Stable id for a pair, independent of order — so re-scans don't create copies. */
export function duplicatePairId(idA: string, idB: string): string {
  return idA < idB ? `dup:${idA}|${idB}` : `dup:${idB}|${idA}`;
}

/**
 * Flags likely duplicates by name similarity, corroborated by GPS proximity
 * where available. This market has many genuinely distinct showrooms only
 * metres apart, so proximity alone is deliberately NOT used as a signal —
 * only a name match (exact or one-contains-the-other after stripping
 * generic words) creates a flag. Never auto-merges; always for manual review.
 */
export function findSuspectedDuplicates(dealerships: Dealership[]): DuplicateFlag[] {
  const candidates = dealerships
    .filter((d) => d.visitStatus !== 'competitor' && d.visitStatus !== 'closed_moved')
    .map((d) => ({ d, ar: normaliseArabicName(d.nameAr) }));
  const flags: DuplicateFlag[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      // The same operator with a desk in both markets is two real showrooms, not a duplicate.
      if (marketOf(a.d) !== marketOf(b.d)) continue;

      let reason: string | null = null;
      const en = englishNameMatch(a.d.nameEn, b.d.nameEn);
      if (en === 'exact') reason = 'Exact name match';
      else if (en === 'overlap') reason = `Name overlap ("${a.d.nameEn}" / "${b.d.nameEn}")`;
      // Many records carry an Arabic name the English transliteration misses.
      if (!reason && a.ar.length >= 3 && a.ar === b.ar) {
        reason = `Arabic name match ("${a.d.nameAr}")`;
      }
      if (!reason) continue;

      const distance = haversineMeters(a.d, b.d);
      flags.push({
        id: duplicatePairId(a.d.id, b.d.id),
        dealershipIdA: a.d.id,
        dealershipIdB: b.d.id,
        reason,
        distanceMeters: Number.isFinite(distance) ? Math.round(distance) : null,
        createdAt: now,
        status: 'pending',
      });
    }
  }

  return flags;
}
