import "server-only";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { z } from "zod";
import {
  HORIZON_LABEL,
  RISK_LABEL,
  RiskAnswers,
  RiskLevel,
  buildAllocation,
  scoreRiskLevel,
} from "@/lib/allocation";
import { summarizeCashflow, spendingThisMonth } from "@/lib/cashflow";
import { prisma } from "@/lib/db";
import { ASSET_CATEGORY_META, AssetCategory } from "@/lib/domain";
import { getInvestOverview } from "@/lib/invest";
import { createDepositOrderViaAgentToolkit } from "@/lib/paypal";
import { monthlyRule, nextRunDates } from "@/lib/schedule";
import { txTitle } from "@/lib/tx-format";
import { startDeposit } from "@/lib/wallet";
import type { AssistantCard, ReviewCard } from "./cards";

export type ToolContext = { userId: string; now: Date };
export type ToolOutput = { result: unknown; cards?: AssistantCard[]; steps?: string[] };

type ToolSpec = {
  definition: ChatCompletionTool;
  /** Progress labels shown to the user. Empty = silent tool. */
  label: string | null;
  /** When true, the turn ends after this tool (the user must answer next). */
  endsTurn?: boolean;
  run: (args: unknown, ctx: ToolContext) => Promise<ToolOutput>;
};

const fn = (name: string, description: string, parameters: Record<string, unknown>): ChatCompletionTool => ({
  type: "function",
  function: { name, description, parameters: { type: "object", additionalProperties: false, ...parameters } },
});

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Plain-language risks. Fixed copy: no jargon, no promises about returns.
const RISKS: Extract<AssistantCard, { kind: "risks" }>["items"] = [
  {
    tone: "danger",
    title: "Prices go down, too",
    body: "Your investments can be worth less than you put in. In a bad year, a mix like this could fall 15% or more before it recovers.",
  },
  {
    tone: "amber",
    title: "Time is your friend",
    body: "Money you won't need for 5+ years has more time to recover from drops. Avoid selling in a panic.",
  },
  {
    tone: "teal",
    title: "Keep your safety net",
    body: "Your emergency fund stays in cash, so a surprise bill never forces you to sell.",
  },
];

const AutoInvestArgs = z.object({
  amount_cents: z.number().int().min(100).max(1_000_000),
  days: z.array(z.number().int().min(1).max(31)).min(1).max(4),
});

const ReviewArgs = z.object({
  amount_cents: z.number().int().min(100).max(1_000_000),
  risk_level: RiskLevel,
  auto_invest_amount_cents: z.number().int().min(100).max(1_000_000).nullable().optional(),
  auto_invest_days: z.array(z.number().int().min(1).max(31)).max(4).nullable().optional(),
});

export const TOOLS: Record<string, ToolSpec> = {
  get_balance: {
    label: "Read your Finpal balance",
    definition: fn("get_balance", "Get the user's current Finpal wallet balance (funded with PayPal).", { properties: {} }),
    run: async (_a, { userId }) => {
      const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceCents: true } });
      return { result: { balance: usd(u.balanceCents), balance_cents: u.balanceCents } };
    },
  },

  list_transactions: {
    label: "Looked at your recent activity",
    definition: fn("list_transactions", "List the user's most recent transactions, newest first.", {
      properties: { limit: { type: "integer", minimum: 1, maximum: 30, description: "How many (default 10)." } },
    }),
    run: async (args, { userId }) => {
      const { limit = 10 } = z.object({ limit: z.number().int().min(1).max(30).optional() }).parse(args ?? {});
      const txs = await prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
      return {
        result: txs.map((t) => ({
          date: t.createdAt.toISOString().slice(0, 10),
          type: t.type,
          who: txTitle(t),
          amount: usd(t.amountCents),
          status: t.status,
        })),
      };
    },
  },

  summarize_cashflow: {
    label: null, // uses custom steps
    definition: fn(
      "summarize_cashflow",
      "Analyze the last 12 complete months: average income, average spending, emergency fund (3 months of spending) and how much is ready to invest now. ONLY call after the user explicitly agreed to let you analyze their history.",
      { properties: {} },
    ),
    run: async (_a, { userId, now }) => {
      const s = await summarizeCashflow(userId, 12, now);
      const steps = ["Read your Finpal balance", `Analyzed ${s.months} months of activity`];
      if (s.steadyIncome) steps.push("Found a steady income pattern");
      return {
        steps,
        cards: [
          {
            kind: "cashflow",
            avgIncomeCents: s.avgIncomeCents,
            avgSpendCents: s.avgSpendCents,
            emergencyFundCents: s.emergencyFundCents,
            balanceCents: s.balanceCents,
            readyToInvestCents: s.readyToInvestCents,
            months: s.months,
            steadyIncome: s.steadyIncome && { counterparty: s.steadyIncome.counterparty, monthsPaid: s.steadyIncome.monthsPaid },
          },
        ],
        result: {
          average_monthly_income: usd(s.avgIncomeCents),
          average_monthly_spending: usd(s.avgSpendCents),
          emergency_fund_3_months: usd(s.emergencyFundCents),
          balance: usd(s.balanceCents),
          ready_to_invest_now: usd(s.readyToInvestCents),
          ready_to_invest_cents: s.readyToInvestCents,
          steady_income: s.steadyIncome
            ? `${s.steadyIncome.counterparty} paid in ${s.steadyIncome.monthsPaid} of ${s.months} months (about ${usd(s.steadyIncome.typicalCents)})`
            : null,
          top_spending_per_month: s.topSpending.map((x) => `${x.category} ${usd(x.avgCents)}`),
          note: "The card with these numbers is already visible to the user. Do not repeat every number.",
        },
      };
    },
  },

  spending_this_month: {
    label: "Added up this month's spending",
    definition: fn("spending_this_month", "Spending and income for the current calendar month, by category.", { properties: {} }),
    run: async (_a, { userId, now }) => {
      const s = await spendingThisMonth(userId, now);
      return {
        cards: [{ kind: "spending", ...s }],
        result: {
          month: s.month,
          income: usd(s.incomeCents),
          spending: usd(s.spendCents),
          by_category: s.categories.map((c) => `${c.category} ${usd(c.cents)}`),
          note: "A card with this breakdown is already visible to the user.",
        },
      };
    },
  },

  get_portfolio: {
    label: "Checked your portfolio",
    definition: fn("get_portfolio", "Get the user's current investments, value and allocation by category.", { properties: {} }),
    run: async (_a, { userId }) => {
      const o = await getInvestOverview(userId);
      const held = o.rows.filter((r) => r.valueCents > 0);
      const cards: AssistantCard[] = [];
      if (held.length) {
        const byCat = new Map<string, number>();
        for (const r of held) byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.valueCents);
        cards.push({
          kind: "portfolio",
          title: "Your portfolio",
          chip: `${held.length} ${held.length === 1 ? "holding" : "holdings"}`,
          totalCents: o.investedCents,
          lines: [...byCat.entries()].map(([cat, cents]) => {
            const c = AssetCategory.catch("INDEX").parse(cat);
            return {
              category: c,
              label: ASSET_CATEGORY_META[c].label,
              color: ASSET_CATEGORY_META[c].color,
              weight: Math.round((cents / o.investedCents) * 100),
              amountCents: cents,
              assetId: "",
              assetName: held.filter((h) => h.category === c).map((h) => h.name).join(", "),
              explanation: "",
            };
          }),
        });
      }
      return {
        cards,
        result: {
          cash: usd(o.cashCents),
          invested: usd(o.investedCents),
          holdings: held.map((r) => ({ name: r.name, category: ASSET_CATEGORY_META[AssetCategory.catch("INDEX").parse(r.category)].label, value: usd(r.valueCents) })),
        },
      };
    },
  },

  save_risk_profile: {
    label: "Saved your risk profile",
    definition: fn(
      "save_risk_profile",
      "Save the user's answers and compute their risk level (CONSERVATIVE, MODERATE or AGGRESSIVE). Call once you know all four answers.",
      {
        properties: {
          experience: { type: "string", enum: ["none", "some", "experienced"] },
          goal: { type: "string", description: "The user's goal in a few words, e.g. 'Grow my savings'." },
          horizon: { type: "string", enum: ["short", "medium", "long"], description: "short < 2 years, medium 2-5 years, long 5+ years" },
          tolerance: {
            type: "string",
            enum: ["sell", "wait", "buy_more"],
            description: "What they'd do if the investment dropped 10% in a month.",
          },
        },
        required: ["experience", "goal", "horizon", "tolerance"],
      },
    ),
    run: async (args, { userId }) => {
      const a = RiskAnswers.parse(args);
      const level = scoreRiskLevel(a);
      await prisma.riskProfile.upsert({
        where: { userId },
        create: { userId, ...a, level },
        update: { ...a, level },
      });
      return {
        cards: [{ kind: "profile", level, levelLabel: RISK_LABEL[level], horizonLabel: HORIZON_LABEL[a.horizon], goal: a.goal }],
        result: { risk_level: level, label: `${RISK_LABEL[level]} · ${HORIZON_LABEL[a.horizon]}` },
      };
    },
  },

  build_portfolio: {
    label: "Built your starter portfolio",
    definition: fn("build_portfolio", "Build a simple starter portfolio for a risk level and amount. Shows a donut card.", {
      properties: {
        risk_level: { type: "string", enum: ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] },
        amount_cents: { type: "integer", description: "Amount to invest in cents, e.g. 44000 for $440." },
      },
      required: ["risk_level", "amount_cents"],
    }),
    run: async (args, { userId }) => {
      const { risk_level, amount_cents } = z
        .object({ risk_level: RiskLevel, amount_cents: z.number().int().min(100).max(1_000_000) })
        .parse(args);
      const lines = buildAllocation(risk_level, amount_cents);
      const profile = await prisma.riskProfile.findUnique({ where: { userId } });
      const horizon = profile ? HORIZON_LABEL[RiskAnswers.shape.horizon.catch("long").parse(profile.horizon)] : null;
      return {
        cards: [
          {
            kind: "portfolio",
            title: "Your starter portfolio",
            chip: [RISK_LABEL[risk_level], horizon].filter(Boolean).join(" · "),
            totalCents: amount_cents,
            lines,
          },
        ],
        result: {
          lines: lines.map((l) => `${l.weight}% ${l.label} (${l.assetName}): ${usd(l.amountCents)}`),
          note: "The donut card is visible. Explain each line in one plain sentence.",
        },
      };
    },
  },

  explain_risks: {
    label: "Prepared the key risks",
    definition: fn("explain_risks", "Show the main risks of investing in plain language as cards.", { properties: {} }),
    run: async () => ({
      cards: [{ kind: "risks", items: RISKS }],
      result: { shown: RISKS.map((r) => r.title), note: "Risk cards are visible. Add at most one short sentence." },
    }),
  },

  schedule_auto_invest: {
    label: "Planned your Auto-invest",
    definition: fn(
      "schedule_auto_invest",
      "Preview a recurring Auto-invest plan (e.g. $50 on paydays, the 15th and 30th). This is only a proposal; it is saved when the user confirms the review.",
      {
        properties: {
          amount_cents: { type: "integer", description: "Amount per run in cents, e.g. 5000." },
          days: { type: "array", items: { type: "integer", minimum: 1, maximum: 31 }, description: "Days of the month." },
        },
        required: ["amount_cents", "days"],
      },
    ),
    run: async (args, { now }) => {
      const a = AutoInvestArgs.parse(args);
      const next = nextRunDates(monthlyRule(a.days), now, 4);
      return {
        result: {
          proposal: `${usd(a.amount_cents)} on days ${a.days.join(" and ")} of each month`,
          next_runs: next.map((d) => d.toISOString().slice(0, 10)),
          saved: false,
        },
      };
    },
  },

  create_deposit_order: {
    label: "Prepared a PayPal deposit order",
    definition: fn(
      "create_deposit_order",
      "Create (but NOT capture) a PayPal sandbox order to add money to the Finpal balance. No money moves until the user approves it in PayPal and confirms in Finpal. review_and_confirm already does this automatically when the balance is short.",
      { properties: { amount_cents: { type: "integer" } }, required: ["amount_cents"] },
    ),
    run: async (args, { userId }) => {
      const { amount_cents } = z.object({ amount_cents: z.number().int().min(100).max(1_000_000) }).parse(args);
      const orderId = await createDepositOrderViaAgentToolkit(amount_cents);
      await startDeposit(userId, amount_cents, orderId);
      return { result: { order_id: orderId, amount: usd(amount_cents), status: "CREATED, waiting for user approval" } };
    },
  },

  review_and_confirm: {
    label: "Prepared your review",
    definition: fn(
      "review_and_confirm",
      "Show the final 'Review & confirm' card for investing. This does NOT invest: the user must press 'Confirm & fund'. Always the last step of the investing flow.",
      {
        properties: {
          amount_cents: { type: "integer" },
          risk_level: { type: "string", enum: ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] },
          auto_invest_amount_cents: { type: ["integer", "null"], description: "Recurring amount in cents, or null." },
          auto_invest_days: { type: ["array", "null"], items: { type: "integer" }, description: "Days of month, or null." },
        },
        required: ["amount_cents", "risk_level"],
      },
    ),
    run: async (args, ctx) => {
      const a = ReviewArgs.parse(args);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { balanceCents: true } });
      const shortfall = Math.max(0, a.amount_cents - user.balanceCents);
      let depositOrderId: string | null = null;
      if (shortfall > 0) {
        depositOrderId = await createDepositOrderViaAgentToolkit(shortfall);
        await startDeposit(ctx.userId, shortfall, depositOrderId);
      }
      const profile = await prisma.riskProfile.findUnique({ where: { userId: ctx.userId } });
      const horizon = profile ? HORIZON_LABEL[RiskAnswers.shape.horizon.catch("long").parse(profile.horizon)] : null;
      const days = a.auto_invest_days?.length ? a.auto_invest_days : null;
      const card: ReviewCard = {
        kind: "review",
        amountCents: a.amount_cents,
        level: a.risk_level,
        levelLabel: RISK_LABEL[a.risk_level],
        chip: [RISK_LABEL[a.risk_level], horizon].filter(Boolean).join(" · "),
        lines: buildAllocation(a.risk_level, a.amount_cents),
        balanceCents: user.balanceCents,
        shortfallCents: shortfall,
        depositOrderId,
        autoInvest:
          a.auto_invest_amount_cents && days
            ? {
                amountCents: a.auto_invest_amount_cents,
                days,
                nextRuns: nextRunDates(monthlyRule(days), ctx.now, 4).map((d) => d.toISOString()),
              }
            : null,
      };
      return {
        cards: [card],
        result: {
          shown: "Review & confirm card",
          funding: shortfall > 0 ? `${usd(shortfall)} via PayPal, rest from balance` : "Finpal balance (funded with PayPal)",
          note: "Nothing has been invested. Tell the user to review and press Confirm & fund when ready.",
        },
      };
    },
  },

  suggest_replies: {
    label: null,
    endsTurn: true,
    definition: fn(
      "suggest_replies",
      "Show 2-4 tappable quick replies under your question. Use it whenever you ask the user a multiple-choice question.",
      {
        properties: { options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } },
        required: ["options"],
      },
    ),
    run: async (args) => {
      const { options } = z.object({ options: z.array(z.string().min(1).max(60)).min(1).max(4) }).parse(args);
      return { cards: [{ kind: "choices", options }], result: { shown: options } };
    },
  },
};

export const TOOL_DEFINITIONS = Object.values(TOOLS).map((t) => t.definition);
