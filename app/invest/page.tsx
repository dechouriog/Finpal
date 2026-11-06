import { InvestView } from "@/components/invest/InvestView";
import type { AssetRow, PlanRow } from "@/components/invest/types";
import { AssetCategory } from "@/lib/domain";
import { getInvestOverview } from "@/lib/invest";
import { describeRule, nextRunDates, parseMonthDays } from "@/lib/schedule";
import { getCurrentUser } from "@/lib/session";

export default async function InvestPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const user = await getCurrentUser();
  const { cashCents, investedCents, rows, plans } = await getInvestOverview(user.id);
  const now = new Date();

  const assetRows: AssetRow[] = rows.map((r) => ({
    ...r,
    category: AssetCategory.catch("INDEX").parse(r.category),
    pct: investedCents ? (r.valueCents / investedCents) * 100 : 0,
  }));

  const planRows: PlanRow[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    amountCents: p.amountCents,
    recurrenceRule: p.recurrenceRule,
    days: parseMonthDays(p.recurrenceRule),
    description: describeRule(p.recurrenceRule),
    nextRuns: nextRunDates(p.recurrenceRule, now, 4).map((d) => d.toISOString()),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">Invest</h1>
        <p className="mt-1 text-sm text-muted">Simple, diversified investing with your Finpal balance.</p>
      </div>
      <InvestView
        key={user.id}
        cashCents={cashCents}
        investedCents={investedCents}
        rows={assetRows}
        plans={planRows}
        initialTab={tab === "auto" ? "auto" : "portfolio"}
      />
    </div>
  );
}
