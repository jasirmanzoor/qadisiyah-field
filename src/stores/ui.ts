import { create } from "zustand";

/**
 * Cross-screen UI intents. The command palette lives in the shell, the map
 * lives on "/", so a jump to a showroom is posted here and the map consumes it.
 */
type UiState = {
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  /** A request for the map to open one showroom card. `nonce` makes repeats fire. */
  focusRequest: { id: string; nonce: number } | null;
  requestFocus: (id: string) => void;
  clearFocus: () => void;
  /** A request for the map to run one of its tools. */
  mapAction: { kind: "near" | "list" | "route" | "add" | "satellite"; nonce: number } | null;
  requestMapAction: (kind: NonNullable<UiState["mapAction"]>["kind"]) => void;
  clearMapAction: () => void;
  syncOpen: boolean;
  setSyncOpen: (v: boolean) => void;
};

export const useUi = create<UiState>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  focusRequest: null,
  requestFocus: (id) => set({ focusRequest: { id, nonce: Date.now() } }),
  clearFocus: () => set({ focusRequest: null }),
  mapAction: null,
  requestMapAction: (kind) => set({ mapAction: { kind, nonce: Date.now() } }),
  clearMapAction: () => set({ mapAction: null }),
  syncOpen: false,
  setSyncOpen: (syncOpen) => set({ syncOpen }),
}));
