import type { Transaction } from "@prisma/client";
import { formatShortDate, txIcon, txTitle } from "@/lib/tx-display";
import { cn, formatCents } from "@/lib/utils";

export function TransactionRow({ tx }: { tx: Transaction }) {
  const Icon = txIcon(tx);
  const incoming = tx.amountCents > 0;
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          incoming ? "bg-teal-soft text-teal-ink" : "bg-bg text-navy",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{txTitle(tx)}</p>
        <p className="text-xs text-muted">
          <time dateTime={tx.createdAt.toISOString()}>{formatShortDate(tx.createdAt)}</time>
          {tx.status !== "COMPLETED" && <span className="ml-1.5 capitalize">· {tx.status.toLowerCase()}</span>}
        </p>
      </div>
      <p className={cn("shrink-0 text-sm font-bold tabular", incoming ? "text-success" : "text-ink")}>
        {formatCents(tx.amountCents, { signed: true })}
      </p>
    </div>
  );
}
