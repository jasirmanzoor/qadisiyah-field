import { create } from "zustand";
import {
  annotateFacts,
  EMPTY_DEEPDIVE,
  fingerprint,
  type DeepdiveDraft,
  type IntelPhoto,
  type MarketBrief,
  type PhotoCategory,
  type RawFact,
  type ResearchSnapshot,
  type SurveyDraft,
} from "@/lib/intel";
import type { SurveyPayload } from "@/lib/types";
import { uid } from "@/lib/utils";

const KEY = "qads-intel-v1";

type IntelData = {
  research: Record<string, ResearchSnapshot>;
  history: Record<string, ResearchSnapshot[]>;
  briefs: MarketBrief[];
  deepdives: Record<string, DeepdiveDraft>;
  drafts: Record<string, SurveyDraft>;
  photos: IntelPhoto[];
};

type IntelState = IntelData & {
  hydrated: boolean;
  photoError: string | null;
  hydrate: () => void;
  saveResearch: (dealershipId: string, summary: string, facts: RawFact[], error?: string) => void;
  saveBrief: (topic: string, summary: string, facts: RawFact[], error?: string) => void;
  saveDeepdive: (draft: DeepdiveDraft) => void;
  saveSurveyDraft: (dealershipId: string, payload: Partial<SurveyPayload>, step: number) => void;
  addPhoto: (dealershipId: string, dataUrl: string, category: PhotoCategory, existingFingerprints: string[]) => boolean;
  removePhoto: (id: string) => void;
  reorderPhotos: (dealershipId: string, orderedIds: string[]) => void;
  setPhotoCategory: (id: string, category: PhotoCategory) => void;
};

const EMPTY: IntelData = { research: {}, history: {}, briefs: [], deepdives: {}, drafts: {}, photos: [] };

function read(): IntelData {
  if (typeof localStorage === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<IntelData> | null;
    if (!parsed || typeof parsed !== "object") return EMPTY;
    return {
      research: parsed.research ?? {},
      history: parsed.history ?? {},
      briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
      deepdives: parsed.deepdives ?? {},
      drafts: parsed.drafts ?? {},
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(data: IntelData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function snapshotOf(s: IntelState): IntelData {
  return {
    research: s.research,
    history: s.history,
    briefs: s.briefs,
    deepdives: s.deepdives,
    drafts: s.drafts,
    photos: s.photos,
  };
}

export const useIntel = create<IntelState>((set, get) => ({
  ...EMPTY,
  hydrated: false,
  photoError: null,
  hydrate: () => {
    if (get().hydrated) return;
    set({ ...read(), hydrated: true });
  },
  saveResearch: (dealershipId, summary, facts, error) => {
    const researchedAt = new Date().toISOString();
    const next: ResearchSnapshot = {
      id: uid(),
      dealershipId,
      researchedAt,
      summary,
      facts: annotateFacts(facts, researchedAt),
      error,
    };
    const prev = get().research[dealershipId];
    const history = { ...get().history };
    history[dealershipId] = prev ? [prev, ...(history[dealershipId] ?? [])].slice(0, 3) : history[dealershipId] ?? [];
    const research = { ...get().research, [dealershipId]: next };
    const data = { ...snapshotOf(get()), research, history };
    write(data);
    set({ research, history });
  },
  saveBrief: (topic, summary, facts, error) => {
    const researchedAt = new Date().toISOString();
    const brief: MarketBrief = {
      id: uid(),
      topic,
      researchedAt,
      summary,
      facts: annotateFacts(facts, researchedAt),
      error,
    };
    const briefs = [brief, ...get().briefs].slice(0, 12);
    const data = { ...snapshotOf(get()), briefs };
    write(data);
    set({ briefs });
  },
  saveDeepdive: (draft) => {
    const deepdives = { ...get().deepdives, [draft.dealershipId]: { ...draft, updatedAt: new Date().toISOString() } };
    const data = { ...snapshotOf(get()), deepdives };
    write(data);
    set({ deepdives });
  },
  saveSurveyDraft: (dealershipId, payload, step) => {
    const drafts = {
      ...get().drafts,
      [dealershipId]: { payload, step, updatedAt: new Date().toISOString() },
    };
    const data = { ...snapshotOf(get()), drafts };
    write(data);
    set({ drafts });
  },
  addPhoto: (dealershipId, dataUrl, category, existingFingerprints) => {
    const fp = fingerprint(dataUrl);
    if (!dataUrl || existingFingerprints.includes(fp) || get().photos.some((p) => p.dealershipId === dealershipId && p.fingerprint === fp)) {
      set({ photoError: "duplicate" });
      return false;
    }
    const mine = get().photos.filter((p) => p.dealershipId === dealershipId);
    if (mine.length >= 12) {
      set({ photoError: "limit" });
      return false;
    }
    const photos = [
      { id: uid(), dealershipId, dataUrl, category, capturedAt: new Date().toISOString(), fingerprint: fp },
      ...get().photos,
    ];
    try {
      write({ ...snapshotOf(get()), photos });
    } catch {
      set({ photoError: "quota" });
      return false;
    }
    set({ photos, photoError: null });
    return true;
  },
  removePhoto: (id) => {
    const photos = get().photos.filter((p) => p.id !== id);
    write({ ...snapshotOf(get()), photos });
    set({ photos });
  },
  reorderPhotos: (dealershipId, orderedIds) => {
    const want = new Map(orderedIds.map((id, index) => [id, index]));
    const mine = get().photos.filter((p) => p.dealershipId === dealershipId);
    const rest = get().photos.filter((p) => p.dealershipId !== dealershipId);
    const ranked = [...mine].sort((a, b) => (want.get(a.id) ?? 999) - (want.get(b.id) ?? 999));
    const photos = [...ranked, ...rest];
    write({ ...snapshotOf(get()), photos });
    set({ photos });
  },
  setPhotoCategory: (id, category) => {
    const photos = get().photos.map((p) => (p.id === id ? { ...p, category } : p));
    write({ ...snapshotOf(get()), photos });
    set({ photos });
  },
}));

export function deepdiveFor(id: string, drafts: Record<string, DeepdiveDraft>): DeepdiveDraft {
  return drafts[id] ?? EMPTY_DEEPDIVE(id);
}
