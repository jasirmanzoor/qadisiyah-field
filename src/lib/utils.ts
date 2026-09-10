import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function formatJoinCode(code: string): string {
  const c = normalizeJoinCode(code);
  if (c.length <= 3) return c;
  return `${c.slice(0, 3)}-${c.slice(3)}`;
}

export function inviteUrl(code: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  const formatted = formatJoinCode(code);
  if (!origin) return formatted;
  return `${origin.replace(/\/$/, "")}/login?team=${encodeURIComponent(formatted)}`;
}

export function waLink(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

export function telLink(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 8) return null;
  return `tel:${cleaned}`;
}

export function mapsLink(lat: number, lng: number, name?: string): string {
  const q = name ? encodeURIComponent(`${name} ${lat},${lng}`) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-SA", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatSar(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-SA", { maximumFractionDigits: 0 })} SAR`;
}

export function formatSarCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B SAR`;
  if (abs >= 10_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M SAR`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M SAR`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(0)}k SAR`;
  return formatSar(n);
}

export function formatPct(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-SA", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toBool(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}
