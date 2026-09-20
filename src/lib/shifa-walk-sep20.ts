export type { ShifaSeedIn, ShifaWalked } from "./shifa-walk-sep20-types";
export { SHIFA_WALK_PATCHES } from "./shifa-walk-sep20-patches";
import { SHIFA_WALK_SEP20_A } from "./shifa-walk-sep20-a";
import { SHIFA_WALK_SEP20_B } from "./shifa-walk-sep20-b";

/** 20 Sep 2026 Al Shifa walk: 29 new showrooms, S0085–S0113. */
export const SHIFA_WALK_SEP20 = [...SHIFA_WALK_SEP20_A, ...SHIFA_WALK_SEP20_B];
