// Pure helpers for the research API route: turning a Claude web-search
// response into a trustworthy finding. Kept free of Next/SDK runtime imports
// so it can be unit-tested directly.

export type Confidence = 'high' | 'medium' | 'low';

export interface ParsedFinding {
  found: boolean;
  value: string | null;
  confidence: Confidence;
  sourceUrl: string | null;
  summary: string;
}

// Minimal structural shapes of the response content blocks we read.
interface TextLike {
  type: 'text';
  text: string;
  citations?: Array<{ type: string; url?: string }> | null;
}
interface SearchResultLike {
  type: 'web_search_tool_result';
  content: Array<{ type: string; url?: string }> | { type: string };
}
type BlockLike = TextLike | SearchResultLike | { type: string };

/** Only http(s) links are ever stored or rendered — web content is untrusted. */
export function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function normaliseUrlForMatch(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = decodeURI(u.pathname).replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Every URL the search tool actually returned or the model cited. */
export function collectRetrievedUrls(blocks: BlockLike[]): Set<string> {
  const urls = new Set<string>();
  for (const b of blocks) {
    if (b.type === 'web_search_tool_result') {
      const content = (b as SearchResultLike).content;
      if (Array.isArray(content)) {
        for (const r of content) if (r.url) urls.add(normaliseUrlForMatch(r.url));
      }
    } else if (b.type === 'text') {
      for (const c of (b as TextLike).citations ?? []) if (c.url) urls.add(normaliseUrlForMatch(c.url));
    }
  }
  return urls;
}

/**
 * The final answer can be split across several text blocks (web search
 * interleaves citations), so join all text written after the last search
 * result rather than trusting only the last block.
 */
export function finalAnswerText(blocks: BlockLike[]): string {
  let lastResultIdx = -1;
  blocks.forEach((b, i) => {
    if (b.type === 'web_search_tool_result' || b.type === 'server_tool_use') lastResultIdx = i;
  });
  return blocks
    .slice(lastResultIdx + 1)
    .filter((b): b is TextLike => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** Scan for the last balanced {...} object in the text that parses as a finding. */
export function extractFinding(text: string): ParsedFinding | null {
  const candidates: string[] = [];
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
  candidates.push(...fenced.reverse());

  // Balanced-brace scan (string-aware) collecting top-level objects, last first.
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = depth > 0;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) objects.push(text.slice(start, i + 1));
    }
  }
  candidates.push(...objects.reverse());

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (typeof parsed?.found !== 'boolean') continue;
      const value = typeof parsed.value === 'string' && parsed.value.trim() ? parsed.value.trim() : null;
      return {
        found: parsed.found && value !== null,
        value: parsed.found ? value : null,
        confidence: (['high', 'medium', 'low'] as const).includes(parsed.confidence) ? parsed.confidence : 'low',
        sourceUrl: safeHttpUrl(parsed.sourceUrl),
        summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 2000) : '',
      };
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/**
 * Guard against fabricated sources: a finding whose source URL never appeared
 * in the search results is downgraded to low confidence and says so.
 */
export function verifySource(finding: ParsedFinding, retrieved: Set<string>): ParsedFinding {
  if (!finding.found) return finding;
  if (!finding.sourceUrl) {
    return {
      ...finding,
      confidence: 'low',
      summary: `${finding.summary} [No source URL given — treat as unverified.]`.trim(),
    };
  }
  if (!retrieved.has(normaliseUrlForMatch(finding.sourceUrl))) {
    return {
      ...finding,
      confidence: 'low',
      summary: `${finding.summary} [Source URL was not among the pages the search returned — verify before accepting.]`.trim(),
    };
  }
  return finding;
}

export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number } | null;
}

export interface Pricing {
  inputPerToken: number;
  outputPerToken: number;
  perSearch: number;
}

export function costFromUsage(usages: UsageLike[], p: Pricing): { costUsd: number; searches: number } {
  let cost = 0;
  let searches = 0;
  for (const u of usages) {
    const s = u.server_tool_use?.web_search_requests ?? 0;
    searches += s;
    cost +=
      u.input_tokens * p.inputPerToken +
      (u.cache_creation_input_tokens ?? 0) * p.inputPerToken * 1.25 +
      (u.cache_read_input_tokens ?? 0) * p.inputPerToken * 0.1 +
      u.output_tokens * p.outputPerToken +
      s * p.perSearch;
  }
  return { costUsd: Math.round(cost * 10000) / 10000, searches };
}

/** Constant-time string comparison for the access token. */
export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
