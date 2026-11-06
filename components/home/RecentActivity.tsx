import Link from "next/link";
import type { Transaction } from "@prisma/client";
import { TransactionRow } from "@/components/common/TransactionRow";

export function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  return (
    <section aria-labelledby="recent-heading" className="rounded-2xl bg-surface px-5 pb-2 pt-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h2 id="recent-heading" className="font-display text-base font-bold text-ink">
          Recent activity
        </h2>
        <Link href="/activity" className="rounded text-sm font-semibold text-teal-ink hover:underline">
          See all
        </Link>
      </div>
      {transactions.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted">No activity yet.</p>
          <Link href="/add-money" className="mt-2 inline-block rounded text-sm font-semibold text-teal-ink hover:underline">
            Add money with PayPal
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {transactions.map((tx) => (
            <li key={tx.id}>
              <TransactionRow tx={tx} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
