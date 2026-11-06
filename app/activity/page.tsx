import { ActivityView } from "@/components/activity/ActivityView";
import type { ActivityRow } from "@/lib/activity";
import { prisma } from "@/lib/db";
import { TxStatus, TxType } from "@/lib/domain";
import { getCurrentUser } from "@/lib/session";
import { txTitle } from "@/lib/tx-format";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  const txs = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  const rows: ActivityRow[] = txs.map((t) => ({
    id: t.id,
    type: TxType.catch("SEND").parse(t.type),
    category: t.category,
    counterparty: t.counterparty,
    title: txTitle(t),
    amountCents: t.amountCents,
    status: TxStatus.catch("COMPLETED").parse(t.status),
    note: t.note,
    createdAt: t.createdAt.toISOString(),
    externalRef: t.externalRef,
    shares: t.shares,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">Activity</h1>
        <p className="mt-1 text-sm text-muted">Every deposit, withdrawal, transfer and investment.</p>
      </div>
      <ActivityView rows={rows} />
    </div>
  );
}
