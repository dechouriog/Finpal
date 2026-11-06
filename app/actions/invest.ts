"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorMessage } from "@/lib/api";
import { RiskLevel, RISK_LABEL, buildAllocation } from "@/lib/allocation";
import { prisma } from "@/lib/db";
import { buyWithinTx, sellWithinTx } from "@/lib/invest";
import { monthlyRule, nextRunDates } from "@/lib/schedule";
import { getCurrentUserId } from "@/lib/session";
import { AmountCents, AutoInvestPlanInput, MonthDays, TradeInput } from "@/lib/validation";
import type { ActionResult } from "./demo";

function refresh() {
  revalidatePath("/", "layout");
}

export async function buyAsset(input: TradeInput): Promise<ActionResult> {
  const parsed = TradeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const userId = await getCurrentUserId();
  try {
    await prisma.$transaction((tx) => buyWithinTx(tx, { userId, ...parsed.data }));
  } catch (err) {
    return { ok: false, error: errorMessage(err, "The order could not be completed.") };
  }
  refresh();
  return { ok: true };
}

export async function sellAsset(input: TradeInput): Promise<ActionResult> {
  const parsed = TradeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const userId = await getCurrentUserId();
  try {
    await prisma.$transaction((tx) => sellWithinTx(tx, { userId, ...parsed.data }));
  } catch (err) {
    return { ok: false, error: errorMessage(err, "The order could not be completed.") };
  }
  refresh();
  return { ok: true };
}

/** Create or update a recurring Auto-invest plan (stored for Bryntum-style calendars). */
export async function saveAutoInvestPlan(input: AutoInvestPlanInput): Promise<ActionResult> {
  const parsed = AutoInvestPlanInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const userId = await getCurrentUserId();
  const { id, amountCents, days } = parsed.data;
  const now = new Date();
  const data = {
    name: `Auto-invest $${(amountCents / 100).toFixed(2)}`,
    amountCents,
    recurrenceRule: monthlyRule(days),
  };

  if (id) {
    const res = await prisma.autoInvestEvent.updateMany({ where: { id, userId }, data });
    if (res.count !== 1) return { ok: false, error: "Plan not found." };
  } else {
    await prisma.autoInvestEvent.create({
      data: {
        ...data,
        userId,
        startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)),
        endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 30)),
      },
    });
  }
  refresh();
  return { ok: true };
}

export async function deleteAutoInvestPlan(id: unknown): Promise<ActionResult> {
  const parsed = z.cuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Plan not found." };
  const userId = await getCurrentUserId();
  await prisma.autoInvestEvent.deleteMany({ where: { id: parsed.data, userId } });
  refresh();
  return { ok: true };
}

const StarterPortfolioInput = z.object({
  amountCents: AmountCents,
  level: RiskLevel,
  autoInvest: z.object({ amountCents: AmountCents, days: MonthDays }).nullable(),
});
export type StarterPortfolioInput = z.input<typeof StarterPortfolioInput>;

export type StarterPortfolioResult =
  | { ok: true; investedCents: number; nextRuns: string[]; balanceCents: number }
  | { ok: false; error: string };

/**
 * Executes the plan the assistant proposed. Only ever called from the
 * "Confirm & fund" button, never by the AI itself. Funding through PayPal (if the
 * balance was short) has already been captured by the time this runs.
 */
export async function confirmStarterPortfolio(input: StarterPortfolioInput): Promise<StarterPortfolioResult> {
  const parsed = StarterPortfolioInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const userId = await getCurrentUserId();
  const { amountCents, level, autoInvest } = parsed.data;
  const lines = buildAllocation(level, amountCents);
  const now = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const line of lines) {
          if (line.amountCents <= 0) continue;
          await buyWithinTx(tx, {
            userId,
            assetId: line.assetId,
            amountCents: line.amountCents,
            note: `Starter portfolio · ${RISK_LABEL[level]}`,
          });
        }
        if (autoInvest) {
          await tx.autoInvestEvent.create({
            data: {
              userId,
              name: `Auto-invest $${(autoInvest.amountCents / 100).toFixed(2)} · ${RISK_LABEL[level]}`,
              amountCents: autoInvest.amountCents,
              recurrenceRule: monthlyRule(autoInvest.days),
              startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)),
              endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 30)),
            },
          });
        }
      },
      { timeout: 20_000 },
    );
  } catch (err) {
    return { ok: false, error: errorMessage(err, "We couldn't place your investment.") };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceCents: true } });
  const nextRuns = autoInvest ? nextRunDates(monthlyRule(autoInvest.days), now, 4).map((d) => d.toISOString()) : [];
  refresh();
  return { ok: true, investedCents: amountCents, nextRuns, balanceCents: user.balanceCents };
}
