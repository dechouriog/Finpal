import { z } from "zod";

/** Pal's growth stages, in order. Shared by the server and the UI. */
export const PAL_STAGES = ["seed", "sprout", "plant", "tree"] as const;
export const PalStage = z.enum(PAL_STAGES);
export type PalStage = z.infer<typeof PalStage>;

/** One line Pal says when the user reaches a stage. */
export const STAGE_MESSAGE: Record<PalStage, string> = {
  seed: "Every tree starts as a seed. This one's yours.",
  sprout: "Look at that. Your first leaves.",
  plant: "Auto-invest is on. Watch this thing grow, a little every payday.",
  tree: "Three contributions in. That's a real habit now. Slow money, strong money.",
};

export const stageRank = (s: PalStage) => PAL_STAGES.indexOf(s);

/**
 * Stage from the user's progress:
 *  - sprout: first investment confirmed (at least one contribution)
 *  - plant:  Auto-invest activated
 *  - tree:   3+ contributions completed
 * A "contribution" is one investing moment (all the buys placed together count once).
 */
export function stageFromProgress(p: { contributions: number; autoInvestActive: boolean }): PalStage {
  if (p.contributions >= 3) return "tree";
  if (p.autoInvestActive) return "plant";
  if (p.contributions >= 1) return "sprout";
  return "seed";
}
