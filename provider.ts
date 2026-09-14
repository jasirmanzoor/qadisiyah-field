import type { z } from "zod";

/**
 * Server-side AI provider abstraction. Nothing here may be imported into a
 * client component: it reads API keys from the environment.
 *
 * Provider is swappable via env (`AI_PROVIDER`), and the app degrades to a
 * clear "not configured" state when no key is present.
 */

export type AiProviderId = "xai" | "anthropic";

export type AiConfig = {
  provider: AiProviderId;
  apiKey: string;
  visionModel: string;
  textModel: string;
  canWebSearch: boolean;
};

const XAI_DEFAULT_MODEL = "grok-4.5";
const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-5";

/** Resolve provider config, or null when the app has no AI credentials. */
export function getAiConfig(): AiConfig | null {
  const requested = (process.env.AI_PROVIDER || "").toLowerCase();
  const xaiKey = process.env.XAI_API_KEY || "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
  const provider: AiProviderId =
    requested === "anthropic" || (!requested && !xaiKey && anthropicKey) ? "anthropic" : "xai";

  if (provider === "anthropic") {
    if (!anthropicKey) return null;
    return {
      provider,
      apiKey: anthropicKey,
      visionModel: process.env.AI_VISION_MODEL || ANTHROPIC_DEFAULT_MODEL,
      textModel: process.env.AI_TEXT_MODEL || ANTHROPIC_DEFAULT_MODEL,
      canWebSearch: false,
    };
  }
  if (!xaiKey) return null;
  return {
    provider,
    apiKey: xaiKey,
    visionModel: process.env.AI_VISION_MODEL || XAI_DEFAULT_MODEL,
    textModel: process.env.AI_TEXT_MODEL || XAI_DEFAULT_MODEL,
    canWebSearch: true,
  };
}

export const AI_NOT_CONFIGURED = "AI Field Survey is not configured yet.";

const REQUEST_TIMEOUT_MS = 120_000;

type PostResult = { json: unknown; error?: undefined } | { json?: undefined; error: string };

async function postJson(url: string, apiKey: string, body: unknown, anthropic: boolean): Promise<PostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (anthropic) {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) return { error: `AI provider error ${res.status}. ${raw.slice(0, 200)}` };
    try {
      return { json: JSON.parse(raw) as unknown };
    } catch {
      return { error: "AI provider returned unreadable data." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { error: message === "The operation was aborted." ? "AI request timed out." : `AI request failed: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Pull plain text out of any of the response shapes the providers return. */
export function extractModelText(body: unknown): string {
  const b = body as Record<string, unknown>;
  if (typeof b.output_text === "string" && b.output_text.trim()) return b.output_text;

  // Anthropic messages API
  const anthropicContent = b.content as { type?: string; text?: string }[] | undefined;
  if (Array.isArray(anthropicContent)) {
    const joined = anthropicContent
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
    if (joined) return joined;
  }

  const choices = b.choices as { message?: { content?: unknown } }[] | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: string }).text ?? "");
        }
        return "";
      })
      .join("\n");
  }

  const output = b.output as { content?: { text?: string; type?: string }[] }[] | undefined;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      if (!item?.content) continue;
      for (const c of item.content) if (typeof c.text === "string") parts.push(c.text);
    }
    return parts.join("\n");
  }
  return "";
}

/** Tolerant JSON extraction — fenced block, bare object, or bare array. */
export function parseJsonBlock(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const candidates = [raw, raw.match(/\{[\s\S]*\}/)?.[0], raw.match(/\[[\s\S]*\]/)?.[0]];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

function dataUrlParts(dataUrl: string): { mediaType: string; base64: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1], base64: m[2] };
}

export type VisionCall = {
  system: string;
  prompt: string;
  images?: string[];
  maxTokens?: number;
};

function buildBody(cfg: AiConfig, call: VisionCall, repairNote?: string) {
  const prompt = repairNote ? `${call.prompt}\n\n${repairNote}` : call.prompt;
  const maxTokens = call.maxTokens ?? 4000;
  const images = call.images ?? [];

  if (cfg.provider === "anthropic") {
    const content: unknown[] = [];
    for (const img of images) {
      const parts = dataUrlParts(img);
      if (!parts) continue;
      content.push({
        type: "image",
        source: { type: "base64", media_type: parts.mediaType, data: parts.base64 },
      });
    }
    content.push({ type: "text", text: prompt });
    return {
      url: "https://api.anthropic.com/v1/messages",
      body: {
        model: cfg.visionModel,
        max_tokens: maxTokens,
        system: call.system,
        messages: [{ role: "user", content }],
      },
    };
  }

  const content: unknown[] = images.map((url) => ({ type: "image_url", image_url: { url, detail: "high" } }));
  content.push({ type: "text", text: prompt });
  return {
    url: "https://api.x.ai/v1/chat/completions",
    body: {
      model: cfg.visionModel,
      max_tokens: maxTokens,
      temperature: 0.1,
      messages: [
        { role: "system", content: call.system },
        { role: "user", content },
      ],
    },
  };
}

/**
 * One multimodal call, validated against a Zod schema. Invalid JSON gets a
 * single repair attempt; after that the caller gets an error instead of
 * guessed data.
 */
export async function callStructured<T extends z.ZodTypeAny>(
  cfg: AiConfig,
  schema: T,
  call: VisionCall,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; error: string }> {
  type Attempt = { ok: true; data: z.infer<T> } | { ok: false; error: string };
  const attempt = async (repairNote?: string): Promise<Attempt> => {
    const { url, body } = buildBody(cfg, call, repairNote);
    const res = await postJson(url, cfg.apiKey, body, cfg.provider === "anthropic");
    if (res.error !== undefined) return { ok: false, error: res.error };
    const text = extractModelText(res.json);
    if (!text.trim()) return { ok: false, error: "AI returned an empty response." };
    const parsed = parseJsonBlock(text);
    if (parsed == null) return { ok: false, error: "AI returned no usable JSON." };
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: `AI output failed validation: ${validated.error.issues[0]?.message ?? "invalid shape"}`,
      };
    }
    return { ok: true, data: validated.data as z.infer<T> };
  };

  const first = await attempt();
  if (first.ok) return first;
  if (first.error.startsWith("AI request timed out") || first.error.startsWith("AI provider error")) {
    return { ok: false, error: first.error };
  }
  const second = await attempt(
    "Your previous reply was not valid JSON for the required schema. Reply again with ONLY the JSON object, no prose, no code fences.",
  );
  return second;
}

/**
 * Public web search through the provider's live-search tool. Shared with the
 * existing bulk-search / research features so there is one search path.
 */
export async function liveSearch(apiKey: string, prompt: string): Promise<{ text: string } | { error: string }> {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };

  const tryOnce = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const raw = await res.text();
    if (!res.ok) return { error: `Search failed (${res.status}). ${raw.slice(0, 180)}` };
    let json: unknown = {};
    try {
      json = JSON.parse(raw);
    } catch {
      return { error: "Search returned unreadable data." };
    }
    const text = extractModelText(json);
    if (!text.trim()) return { error: "Search returned an empty result." };
    return { text };
  };

  const first = await tryOnce("https://api.x.ai/v1/responses", {
    model: "grok-4.5",
    input: prompt,
    tools: [{ type: "web_search" }],
    temperature: 0.2,
  });
  if ("text" in first) return first;

  const retry = await tryOnce("https://api.x.ai/v1/chat/completions", {
    model: "grok-4.5",
    messages: [{ role: "user", content: prompt }],
    tools: [{ type: "web_search" }],
    temperature: 0.2,
    max_tokens: 4000,
  });
  if ("text" in retry) return retry;
  return { error: first.error };
}
