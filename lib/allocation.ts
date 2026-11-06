import { z } from "zod";
import { ASSET_CATEGORY_META, type AssetCategory } from "@/lib/domain";

export const RISK_LEVELS = ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] as const;
export const RiskLevel = z.enum(RISK_LEVELS);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const RISK_LABEL: Record<RiskLevel, string> = {
  CONSERVATIVE: "Conservative",
  MODERATE: "Moderate",
  AGGRESSIVE: "Aggressive",
};

/** Target weights (percent) per risk level. Order matters for display. */
export const ALLOCATION_WEIGHTS: Record<RiskLevel, Record<AssetCategory, number>> = {
  CONSERVATIVE: { INDEX: 30, BOND: 60, GROWTH: 10 },
  MODERATE: { INDEX: 60, BOND: 25, GROWTH: 15 },
  AGGRESSIVE: { INDEX: 70, BOND: 10, GROWTH: 20 },
};

/** The fund Finpal uses for each slice of a starter portfolio. */
export const STARTER_ASSET: Record<AssetCategory, { id: string; name: string }> = {
  INDEX: { id: "total-market-index", name: "Total Market Index Fund" },
  BOND: { id: "short-term-bond", name: "Short-Term Bond Fund" },
  GROWTH: { id: "aurora-cloud", name: "Aurora Cloud Systems" },
};

const EXPLANATION: Record<AssetCategory, string> = {
  INDEX: "Owns a tiny piece of thousands of companies, so one bad company barely moves it. This is the core.",
  BOND: "Loans to governments and companies that pay steady interest. It moves less than stocks and softens drops.",
  GROWTH: "A small slice in fast-growing companies. It can grow more, but it also swings the most.",
};

export type AllocationLine = {
  category: AssetCategory;
  label: string;
  color: string;
  weight: number;
  amountCents: number;
  assetId: string;
  assetName: string;
  explanation: string;
};

/** Split an amount by risk level. Rounds to cents; the last line absorbs rounding. */
export function buildAllocation(level: RiskLevel, amountCents: number): AllocationLine[] {
  const weights = ALLOCATION_WEIGHTS[level];
  const cats = (Object.keys(weights) as AssetCategory[]).filter((c) => weights[c] > 0);
  let remaining = amountCents;
  return cats.map((category, i) => {
    const isLast = i === cats.length - 1;
    const cents = isLast ? remaining : Math.round((amountCents * weights[category]) / 100);
    remaining -= cents;
    return {
      category,
      label: ASSET_CATEGORY_META[category].label,
      color: ASSET_CATEGORY_META[category].color,
      weight: weights[category],
      amountCents: cents,
      assetId: STARTER_ASSET[category].id,
      assetName: STARTER_ASSET[category].name,
      explanation: EXPLANATION[category],
    };
  });
}

/** Risk profile answers -> level. Simple, transparent scoring. */
export const RiskAnswers = z.object({
  experience: z.enum(["none", "some", "experienced"]),
  goal: z.string().trim().min(1).max(120),
  horizon: z.enum(["short", "medium", "long"]),
  tolerance: z.enum(["sell", "wait", "buy_more"]),
});
export type RiskAnswers = z.infer<typeof RiskAnswers>;

export function scoreRiskLevel(a: RiskAnswers): RiskLevel {
  if (a.horizon === "short" || a.tolerance === "sell") return "CONSERVATIVE";
  let score = 0;
  score += a.experience === "none" ? 0 : a.experience === "some" ? 1 : 2;
  score += a.horizon === "medium" ? 0 : 1;
  score += a.tolerance === "wait" ? 1 : 2;
  return score >= 4 ? "AGGRESSIVE" : "MODERATE";
}

export const HORIZON_LABEL: Record<RiskAnswers["horizon"], string> = {
  short: "Under 2 years",
  medium: "2–5 years",
  long: "5+ years",
};
