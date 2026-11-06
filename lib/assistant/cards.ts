/**
 * Structured UI cards the assistant can show. Cards are produced by TOOLS on the
 * server (never free-typed by the model), so numbers always come from real data.
 */
import type { AllocationLine, RiskLevel } from "@/lib/allocation";

export type CashflowCard = {
  kind: "cashflow";
  avgIncomeCents: number;
  avgSpendCents: number;
  emergencyFundCents: number;
  balanceCents: number;
  readyToInvestCents: number;
  months: number;
  steadyIncome: { counterparty: string; monthsPaid: number } | null;
};

export type SpendingCard = {
  kind: "spending";
  month: string;
  incomeCents: number;
  spendCents: number;
  categories: { category: string; cents: number }[];
};

export type ProfileCard = {
  kind: "profile";
  level: RiskLevel;
  levelLabel: string;
  horizonLabel: string;
  goal: string;
};

export type PortfolioCard = {
  kind: "portfolio";
  title: string;
  chip: string;
  totalCents: number;
  lines: AllocationLine[];
};

export type RisksCard = {
  kind: "risks";
  items: { tone: "danger" | "amber" | "teal"; title: string; body: string }[];
};

export type ChoicesCard = { kind: "choices"; options: string[] };

export type ReviewCard = {
  kind: "review";
  amountCents: number;
  level: RiskLevel;
  levelLabel: string;
  chip: string;
  lines: AllocationLine[];
  balanceCents: number;
  /** Amount that must be added through PayPal before investing (0 if the balance covers it). */
  shortfallCents: number;
  /** PayPal order created for the shortfall (created, NOT captured: no money has moved). */
  depositOrderId: string | null;
  autoInvest: { amountCents: number; days: number[]; nextRuns: string[] } | null;
};

export type AssistantCard = CashflowCard | SpendingCard | ProfileCard | PortfolioCard | RisksCard | ChoicesCard | ReviewCard;

/** Events streamed from /api/assistant as newline-delimited JSON. */
export type AssistantEvent =
  | { t: "text"; d: string }
  | { t: "step"; id: string; label: string; status: "running" | "done" | "error" }
  | { t: "card"; card: AssistantCard }
  | { t: "history"; messages: unknown[] }
  | { t: "error"; message: string }
  | { t: "done" };
