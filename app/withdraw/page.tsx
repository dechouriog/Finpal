import type { Metadata } from "next";
import { WithdrawFlow } from "@/components/wallet/WithdrawFlow";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Withdraw" };

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink @3xl/app:text-3xl">Withdraw</h1>
        <p className="mt-1 text-sm text-muted">Move money from Finpal to a PayPal account.</p>
      </div>
      <WithdrawFlow key={user.id} balanceCents={user.balanceCents} />
    </div>
  );
}
