export type AssetRow = {
  id: string;
  name: string;
  category: "INDEX" | "BOND" | "GROWTH";
  priceCents: number;
  description: string;
  shares: number;
  valueCents: number;
  pct: number; // share of the invested portfolio, 0..100
};

export type PlanRow = {
  id: string;
  name: string;
  amountCents: number;
  recurrenceRule: string | null;
  days: number[];
  description: string;
  nextRuns: string[]; // ISO
};
