"use client";

import { motion } from "framer-motion";
import { CalendarClock, Clock, ShieldCheck, TrendingDown, Wallet } from "lucide-react";
import { Donut } from "@/components/invest/Donut";
import { Button } from "@/components/ui/button";
import type {
  AssistantCard,
  CashflowCard,
  PortfolioCard,
  ProfileCard,
  ReviewCard,
  RisksCard,
  SpendingCard,
} from "@/lib/assistant/cards";
import { shortDate } from "@/lib/schedule";
import { cn, formatCents } from "@/lib/utils";

const enter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export function CardView({
  card,
  interactive,
  onChoice,
  onReview,
}: {
  card: AssistantCard;
  interactive: boolean;
  onChoice: (text: string) => void;
  onReview: (card: ReviewCard) => void;
}) {
  switch (card.kind) {
    case "cashflow":
      return <Cashflow card={card} />;
    case "spending":
      return <Spending card={card} />;
    case "profile":
      return <Profile card={card} />;
    case "portfolio":
      return <Portfolio card={card} />;
    case "risks":
      return <Risks card={card} />;
    case "review":
      return <ReviewSummary card={card} onReview={onReview} />;
    case "choices":
      return interactive ? (
        <motion.div {...enter} className="flex flex-wrap gap-2" role="group" aria-label="Quick replies">
          {card.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChoice(o)}
              className="rounded-full bg-surface px-3.5 py-2 text-sm font-semibold text-navy ring-1 ring-navy/30 transition-colors hover:bg-navy-soft"
            >
              {o}
            </button>
          ))}
        </motion.div>
      ) : null;
  }
}

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div {...enter} className={cn("rounded-2xl bg-surface p-4 ring-1 ring-line", className)}>
      {children}
    </motion.div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "teal" | "navy" }) {
  return (
    <div className={cn("rounded-xl p-3", tone === "teal" ? "bg-teal-soft" : "bg-bg")}>
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className={cn("font-display text-base font-extrabold tabular", tone === "teal" ? "text-teal-ink" : "text-ink")}>{value}</p>
    </div>
  );
}

function Cashflow({ card }: { card: CashflowCard }) {
  return (
    <Shell>
      <p className="font-display text-sm font-bold text-ink">Here&apos;s what I found</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Avg. income / month" value={formatCents(card.avgIncomeCents)} />
        <Metric label="Avg. spending / month" value={formatCents(card.avgSpendCents)} />
        <Metric label="Emergency fund (3 mo.)" value={formatCents(card.emergencyFundCents)} />
        <Metric label="Ready to invest now" value={formatCents(card.readyToInvestCents)} tone="teal" />
      </div>
      <p className="mt-3 text-xs text-muted tabular">
        {formatCents(card.balanceCents)} balance − {formatCents(card.emergencyFundCents)} safety net ={" "}
        <span className="font-semibold text-ink">{formatCents(card.readyToInvestCents)}</span>
      </p>
      {card.steadyIncome && (
        <p className="mt-1 text-xs text-muted">
          {card.steadyIncome.counterparty} paid you in {card.steadyIncome.monthsPaid} of the last {card.months} months.
        </p>
      )}
    </Shell>
  );
}

function Spending({ card }: { card: SpendingCard }) {
  const max = Math.max(1, ...card.categories.map((c) => c.cents));
  return (
    <Shell>
      <p className="font-display text-sm font-bold text-ink">{card.month} so far</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Money in" value={formatCents(card.incomeCents)} tone="teal" />
        <Metric label="Money out" value={formatCents(card.spendCents)} />
      </div>
      <ul className="mt-3 space-y-2">
        {card.categories.map((c, i) => (
          <li key={c.category}>
            <div className="flex justify-between text-xs">
              <span className="text-ink">{c.category}</span>
              <span className="font-semibold text-ink tabular">{formatCents(c.cents)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-bg">
              <motion.div
                className="h-full rounded-full bg-navy"
                initial={{ width: 0 }}
                animate={{ width: `${(c.cents / max) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: "easeOut" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Profile({ card }: { card: ProfileCard }) {
  return (
    <motion.div {...enter} className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-3 py-1.5 text-xs font-bold text-teal-ink">
        <ShieldCheck className="size-3.5" aria-hidden />
        {card.levelLabel} · {card.horizonLabel}
      </span>
      <span className="text-xs text-muted">Goal: {card.goal}</span>
    </motion.div>
  );
}

export function AllocationLegend({ lines, explain }: { lines: PortfolioCard["lines"]; explain?: boolean }) {
  return (
    <ul className="w-full space-y-2.5">
      {lines.map((l) => (
        <li key={l.category}>
          <div className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="flex-1 font-semibold text-ink">{l.label}</span>
            <span className="text-muted tabular">{l.weight}%</span>
            <span className="w-16 text-right font-bold text-ink tabular">{formatCents(l.amountCents)}</span>
          </div>
          {explain && l.explanation && <p className="ml-5 mt-0.5 text-xs text-muted">{l.explanation}</p>}
          {explain && l.assetName && <p className="ml-5 text-[11px] text-muted">Fund: {l.assetName}</p>}
        </li>
      ))}
    </ul>
  );
}

function Portfolio({ card }: { card: PortfolioCard }) {
  return (
    <Shell>
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-bold text-ink">{card.title}</p>
        <span className="rounded-full bg-navy-soft px-2.5 py-1 text-[11px] font-bold text-navy">{card.chip}</span>
      </div>
      <div className="mt-3 flex flex-col items-center gap-4">
        <Donut
          size={150}
          thickness={20}
          segments={card.lines.map((l) => ({ label: l.label, color: l.color, value: l.amountCents }))}
          centerTop="Total"
          centerMain={formatCents(card.totalCents)}
          ariaLabel={card.lines.map((l) => `${l.label} ${l.weight}%`).join(", ")}
        />
        <AllocationLegend lines={card.lines} explain />
      </div>
    </Shell>
  );
}

const RISK_STYLE = {
  danger: { bar: "bg-danger", icon: TrendingDown, iconClass: "text-danger" },
  amber: { bar: "bg-amber", icon: Clock, iconClass: "text-[#B45309]" },
  teal: { bar: "bg-teal", icon: Wallet, iconClass: "text-teal-ink" },
} as const;

function Risks({ card }: { card: RisksCard }) {
  return (
    <div className="space-y-2">
      {card.items.map((r, i) => {
        const s = RISK_STYLE[r.tone];
        const Icon = s.icon;
        return (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.12, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl bg-surface p-4 pl-5 ring-1 ring-line"
          >
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", s.bar)} />
            <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
              <Icon className={cn("size-4", s.iconClass)} aria-hidden />
              {r.title}
            </p>
            <p className="mt-1 text-xs text-muted">{r.body}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function ReviewSummary({ card, onReview }: { card: ReviewCard; onReview: (c: ReviewCard) => void }) {
  return (
    <Shell className="ring-2 ring-teal">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-ink">Ready when you are</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink tabular">{formatCents(card.amountCents)}</p>
      <p className="text-sm text-muted">{card.chip} starter portfolio</p>
      {card.autoInvest && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink">
          <CalendarClock className="size-3.5 text-teal-ink" aria-hidden />
          Auto-invest {formatCents(card.autoInvest.amountCents)} every payday · next{" "}
          {card.autoInvest.nextRuns.slice(0, 2).map((d) => shortDate.format(new Date(d))).join(", ")}
        </p>
      )}
      <Button className="mt-4 w-full" onClick={() => onReview(card)}>
        Review &amp; confirm
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted">Nothing happens until you confirm.</p>
    </Shell>
  );
}
