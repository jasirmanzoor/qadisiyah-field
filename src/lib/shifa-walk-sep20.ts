export type { ShifaSeedIn, ShifaWalked } from "./shifa-walk-sep20-types";
export { SHIFA_WALK_PATCHES } from "./shifa-walk-sep20-patches";
import type { ShifaSeedIn } from "./shifa-walk-sep20-types";

/**
 * New lots from the 20 Sep 2026 Al Shifa walk (S0085–S0108).
 * The split data modules were never committed; patches for existing
 * pins still apply via SHIFA_WALK_PATCHES. Keep this array ready so
 * census.ts can merge walk rows without a missing import.
 */
export const SHIFA_WALK_SEP20: ShifaSeedIn[] = [];
