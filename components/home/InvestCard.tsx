import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { formatCents } from "@/lib/utils";

export function InvestCard({ valueCents, positionCount }: { valueCents: number; positionCount: number }) {
  const detail =
    positionCount === 0
      ? "Not invested yet. Ask Pal to get started."
      : `${positionCount} ${positionCount === 1 ? "position" : "positions"} · Portfolio value`;

  return (
    <Link
      href="/invest"
      className="group flex items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line transition-shadow hover:shadow-md"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-soft text-navy">
        <TrendingUp className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-muted">Invest</span>
        <span className="block font-display text-2xl font-extrabold tracking-tight text-ink tabular">
          {formatCents(valueCents)}
        </span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
      <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
