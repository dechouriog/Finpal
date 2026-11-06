import "server-only";
import { prisma } from "@/lib/db";

export type CashflowSummary = {
  months: number;
  balanceCents: number;
  avgIncomeCents: number;
  avgSpendCents: number;
  emergencyFundCents: number;
  readyToInvestCents: number;
  steadyIncome: { counterparty: string; monthsPaid: number; typicalCents: number } | null;
  topSpending: { category: string; avgCents: number }[];
};

const CATEGORY_LABEL: Record<string, string> = {
  rent: "Rent",
  groceries: "Groceries",
  utilities: "Utilities",
  internet: "Internet",
  phone: "Phone",
  transport: "Transport",
  software: "Software",
  dining: "Dining out",
  p2p: "Friends & family",
};
export const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c.charAt(0).toUpperCase() + c.slice(1);

/**
 * Income and spending over the last `months` COMPLETE calendar months.
 * Income = money received; spending = money sent. Deposits, withdrawals and
 * investments are transfers of your own money, so they are excluded.
 * Emergency fund = 3 months of spending. Ready to invest = balance - emergency fund.
 */
export async function summarizeCashflow(userId: string, months = 12, now = new Date()): Promise<CashflowSummary> {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  const [user, txs] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceCents: true } }),
    prisma.transaction.findMany({
      where: { userId, status: "COMPLETED", type: { in: ["RECEIVE", "SEND"] }, createdAt: { gte: start, lt: end } },
    }),
  ]);

  let income = 0;
  let spend = 0;
  const payers = new Map<string, { months: Set<string>; total: number; count: number }>();
  const spendByCat = new Map<string, number>();
  for (const t of txs) {
    if (t.amountCents > 0) {
      income += t.amountCents;
      const key = `${t.createdAt.getUTCFullYear()}-${t.createdAt.getUTCMonth()}`;
      const p = payers.get(t.counterparty) ?? { months: new Set(), total: 0, count: 0 };
      p.months.add(key);
      p.total += t.amountCents;
      p.count += 1;
      payers.set(t.counterparty, p);
    } else {
      spend -= t.amountCents;
      spendByCat.set(t.category, (spendByCat.get(t.category) ?? 0) - t.amountCents);
    }
  }

  const avgIncomeCents = Math.round(income / months);
  const avgSpendCents = Math.round(spend / months);
  const emergencyFundCents = avgSpendCents * 3;
  const ready = Math.max(0, user.balanceCents - emergencyFundCents);

  let steadyIncome: CashflowSummary["steadyIncome"] = null;
  for (const [counterparty, p] of payers) {
    if (p.months.size >= Math.ceil(months * 0.8) && (!steadyIncome || p.months.size > steadyIncome.monthsPaid)) {
      steadyIncome = { counterparty, monthsPaid: p.months.size, typicalCents: Math.round(p.total / p.count) };
    }
  }

  const topSpending = [...spendByCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, total]) => ({ category: categoryLabel(category), avgCents: Math.round(total / months) }));

  return {
    months,
    balanceCents: user.balanceCents,
    avgIncomeCents,
    avgSpendCents,
    emergencyFundCents,
    // Whole dollars keep the suggestion simple.
    readyToInvestCents: Math.floor(ready / 100) * 100,
    steadyIncome,
    topSpending,
  };
}

/** Spending and income for the current calendar month, by category. */
export async function spendingThisMonth(userId: string, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const txs = await prisma.transaction.findMany({
    where: { userId, status: "COMPLETED", type: { in: ["RECEIVE", "SEND"] }, createdAt: { gte: start } },
  });
  const byCat = new Map<string, number>();
  let income = 0;
  let spend = 0;
  for (const t of txs) {
    if (t.amountCents > 0) income += t.amountCents;
    else {
      spend -= t.amountCents;
      byCat.set(t.category, (byCat.get(t.category) ?? 0) - t.amountCents);
    }
  }
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(now);
  return {
    month,
    incomeCents: income,
    spendCents: spend,
    categories: [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, cents]) => ({ category: categoryLabel(category), cents })),
  };
}
