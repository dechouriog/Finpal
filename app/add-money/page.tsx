import type { Metadata } from "next";
import { AddMoneyFlow } from "@/components/wallet/AddMoneyFlow";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Add money" };

export default async function AddMoneyPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">Add money</h1>
        <p className="mt-1 text-sm text-muted">Top up your Finpal balance. Funded with PayPal.</p>
      </div>
      <AddMoneyFlow key={user.id} balanceCents={user.balanceCents} />
    </div>
  );
}
