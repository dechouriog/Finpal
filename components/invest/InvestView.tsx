"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AskAiBanner } from "@/components/home/AskAiBanner";
import { ASSET_CATEGORIES, ASSET_CATEGORY_META } from "@/lib/domain";
import { cn, formatCents } from "@/lib/utils";
import { AssetsGrid } from "./AssetsGrid";
import { AutoInvestTab } from "./AutoInvestTab";
import { Donut } from "./Donut";
import type { AssetRow, PlanRow } from "./types";

type Tab = "portfolio" | "auto";

export function InvestView({
  cashCents,
  investedCents,
  rows,
  plans,
  initialTab,
}: {
  cashCents: number;
  investedCents: number;
  rows: AssetRow[];
  plans: PlanRow[];
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const byCategory = ASSET_CATEGORIES.map((c) => ({
    category: c,
    label: ASSET_CATEGORY_META[c].label,
    color: ASSET_CATEGORY_META[c].color,
    value: rows.filter((r) => r.category === c).reduce((s, r) => s + r.valueCents, 0),
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total value" value={formatCents(cashCents + investedCents)} strong />
        <Stat label="Cash available" value={formatCents(cashCents)} />
        <Stat label="Invested" value={formatCents(investedCents)} />
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Invest sections" className="flex w-fit rounded-full bg-surface p-1 ring-1 ring-line">
        {(
          [
            ["portfolio", "Portfolio"],
            ["auto", "Auto-invest"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("relative h-9 rounded-full px-4 text-sm font-semibold", tab === id ? "text-white" : "text-muted hover:text-ink")}
          >
            {tab === id && (
              <motion.span
                layoutId="invest-tab"
                className="absolute inset-0 rounded-full bg-navy"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === "portfolio" ? (
        <div className="space-y-6">
          <div className="grid items-start gap-6 @3xl/app:grid-cols-3">
            <section
              aria-labelledby="alloc-heading"
              className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line @3xl/app:col-span-1"
            >
              <h2 id="alloc-heading" className="self-start font-display text-base font-bold text-ink">
                Allocation
              </h2>
              <Donut
                segments={byCategory.map((c) => ({ label: c.label, color: c.color, value: c.value }))}
                centerTop="Invested"
                centerMain={formatCents(investedCents)}
                ariaLabel={`Allocation: ${byCategory
                  .map((c) => `${c.label} ${investedCents ? Math.round((c.value / investedCents) * 100) : 0}%`)
                  .join(", ")}`}
              />
              <ul className="w-full space-y-2 text-sm">
                {byCategory.map((c) => (
                  <li key={c.category} className="flex items-center gap-2">
                    <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 text-ink">{c.label}</span>
                    <span className="text-muted tabular">
                      {investedCents ? `${Math.round((c.value / investedCents) * 100)}%` : "0%"}
                    </span>
                    <span className="w-20 text-right font-semibold text-ink tabular">{formatCents(c.value)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <div className="space-y-4 @3xl/app:col-span-2">
              {investedCents === 0 && <AskAiBanner />}
              <AssetsGrid rows={rows} />
              <p className="text-xs text-muted">
                Demo prices are fixed and do not move. Tap an asset to buy or sell.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <AutoInvestTab plans={plans} />
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4 ring-1", strong ? "bg-navy text-white ring-navy" : "bg-surface ring-line")}>
      <p className={cn("text-xs", strong ? "text-white/75" : "text-muted")}>{label}</p>
      <p className={cn("mt-1 truncate font-display text-base font-extrabold tabular @3xl/app:text-2xl", strong ? "text-white" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}
