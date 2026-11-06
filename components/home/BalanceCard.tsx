import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCents } from "@/lib/utils";

export function BalanceCard({ balanceCents }: { balanceCents: number }) {
  return (
    <section
      aria-labelledby="balance-label"
      className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-hero"
    >
      {/* decorative shapes */}
      <span aria-hidden className="absolute -right-10 -top-14 size-44 rounded-full bg-teal/25" />
      <span aria-hidden className="absolute -bottom-16 right-16 size-32 rounded-full bg-white/5" />

      <p id="balance-label" className="relative text-sm font-medium text-white/75">
        Finpal balance
      </p>
      <p className="relative mt-1 font-display text-[2.6rem] font-extrabold leading-tight tracking-tight tabular">
        {formatCents(balanceCents)}
      </p>

      <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/add-money"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-teal px-4 text-sm font-bold text-deep transition-colors hover:bg-teal-strong focus-visible:outline-white"
        >
          <Plus className="size-4" strokeWidth={3} aria-hidden />
          Add money
        </Link>
        <span className="text-xs text-white/75">Funded with PayPal</span>
      </div>
    </section>
  );
}
